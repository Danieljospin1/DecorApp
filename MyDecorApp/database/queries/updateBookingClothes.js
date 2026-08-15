// database/queries/updateBookingClothes.js
import { GetDBConnection } from "../db";
import * as Crypto from "expo-crypto";

// Diff-based, never delete-and-reinsert-all — booking_clothes.id is a
// stable identifier the check-in flow and returnState may hold mid-session,
// so untouched rows must keep their id.
//
//   updated:    [{ id, label, quantity, units, returnedCount }]
//   added:      [{ clothId, label, quantity, units }]
//   removedIds: [id, ...]
//
// Every rule is re-validated against the DB's own returned_count, never
// trusted from the caller — same reasoning as updateBookingReturns
// recomputing returned_count from units itself.
export async function updateBookingClothes(bookingId, { updated = [], added = [], removedIds = [] } = {}) {
  const db = await GetDBConnection();
  const now = new Date().toISOString();

  await db.withTransactionAsync(async () => {
    // ── Removals — only allowed when nothing on that row has returned yet ──
    for (const id of removedIds) {
      const row = await db.getFirstAsync(
        `SELECT returned_count FROM booking_clothes WHERE id = ? AND booking_id = ?`,
        [id, bookingId]
      );
      if (!row) continue; // already gone
      if (row.returned_count > 0) {
        throw new Error("Can't remove an item that already has returned units.");
      }
      await db.runAsync(
        `DELETE FROM booking_clothes WHERE id = ? AND booking_id = ?`,
        [id, bookingId]
      );
    }

    // ── Updates — quantity floor enforced against the DB's real returned_count ──
    for (const item of updated) {
      const row = await db.getFirstAsync(
        `SELECT returned_count FROM booking_clothes WHERE id = ? AND booking_id = ?`,
        [item.id, bookingId]
      );
      if (!row) {
        throw new Error("An item being edited no longer exists.");
      }

      const floor = Math.max(1, row.returned_count);
      if (item.quantity < floor) {
        throw new Error(
          row.returned_count > 0
            ? `Can't reduce "${item.label}" below ${floor} — some units are already returned.`
            : "Quantity must be at least 1."
        );
      }

      const returnedCount = resolveReturnedCount(item);

      await db.runAsync(
        `UPDATE booking_clothes
         SET cloth_label = ?, quantity = ?, units = ?, returned_count = ?, updated_at = ?, synced_at = NULL
         WHERE id = ? AND booking_id = ?`,
        [item.label, item.quantity, JSON.stringify(item.units || []), returnedCount, now, item.id, bookingId]
      );
    }

    // ── Additions — brand new cloth types, always start at zero returns ──
    if (added.length > 0) {
      const maxRow = await db.getFirstAsync(
        `SELECT COALESCE(MAX(sort_order), -1) AS maxOrder FROM booking_clothes WHERE booking_id = ?`,
        [bookingId]
      );
      let nextOrder = maxRow.maxOrder + 1;

      for (const item of added) {
        await db.runAsync(
          `INSERT INTO booking_clothes
             (id, booking_id, cloth_id, cloth_label, quantity, returned_count, units, sort_order, created_at, updated_at, synced_at)
           VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?, ?, NULL)`,
          [Crypto.randomUUID(), bookingId, item.clothId, item.label, item.quantity, JSON.stringify(item.units || []), nextOrder, now, now]
        );
        nextOrder += 1;
      }
    }

    // A booking can't end up with zero items through an edit — that's not
    // "nothing rented," it's a broken booking. Removing the last item
    // should have been done by deleting the whole booking instead.
    const countRow = await db.getFirstAsync(
      `SELECT COUNT(*) AS cnt FROM booking_clothes WHERE booking_id = ?`,
      [bookingId]
    );
    if (countRow.cnt === 0) {
      throw new Error("A booking must have at least one item.");
    }

    // Recompute status in the same transaction — see updateBookingReturns
    // for why this can never be left for the caller to remember.
    const allRows = await db.getAllAsync(
      `SELECT quantity, returned_count FROM booking_clothes WHERE booking_id = ?`,
      [bookingId]
    );
    const allReturned = allRows.every((r) => r.returned_count === r.quantity);

    await db.runAsync(
      `UPDATE bookings SET status = ?, updated_at = ?, synced_at = NULL WHERE id = ?`,
      [allReturned ? "returned" : "active", now, bookingId]
    );
  });
}

function resolveReturnedCount(item) {
  if (item.units && item.units.length > 0) {
    return item.units.filter((u) => u.returned).length;
  }
  return item.returnedCount || 0;
}