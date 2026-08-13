// database/mutations/updateBookingReturns.js
import { GetDBConnection } from "../db";

// Persists return status for every cloth in one booking in a single
// transaction — used by both "All Returned" (caller passes every unit/count
// already flipped to true) and "Confirm Returns" from the partial sheet
// (caller passes whatever the draft ended up as). There's no separate
// "mark all" function because the two cases are the same write with
// different input, not different logic.
//
// clothesState shape (matches what getBookingDetails().clothes returns,
// after the screen's own draft edits):
//   [{ id, quantity, units: [{ color, size, returned }] , returnedCount }]
//
// `id` MUST be the booking_clothes row's UUID (row.id from
// getBookingDetails), not cloth_id — see the note in bookingDetailsQuery.js.
export async function updateBookingReturns(bookingId, clothesState) {
  const db = await GetDBConnection();
  const now = new Date().toISOString();

  await db.withTransactionAsync(async () => {
    for (const item of clothesState) {
      const returnedCount = resolveReturnedCount(item);

      await db.runAsync(
        `UPDATE booking_clothes
         SET units = ?, returned_count = ?, updated_at = ?, synced_at = NULL
         WHERE id = ? AND booking_id = ?`,
        [JSON.stringify(item.units || []), returnedCount, now, item.id, bookingId]
      );
    }

    // The booking's own status only flips to 'returned' when EVERY cloth
    // is fully back — a partial confirm leaves it 'active'. This has to be
    // derived here, in the same transaction, rather than left for the
    // screen to remember to also update — getBookingStatus() elsewhere
    // reads bookings.status directly, so if this drifts, the whole app's
    // idea of "returned" drifts with it.
    const allReturned = clothesState.every(
      (item) => resolveReturnedCount(item) === item.quantity
    );

    await db.runAsync(
      `UPDATE bookings
       SET status = ?, updated_at = ?, synced_at = NULL
       WHERE id = ?`,
      [allReturned ? "returned" : "active", now, bookingId]
    );
  });
}

// Recomputed from `units`, not trusted from item.returnedCount, whenever
// units exist — the count should always be a derived fact about the units
// array, never a second value that could quietly disagree with it.
function resolveReturnedCount(item) {
  if (item.units && item.units.length > 0) {
    return item.units.filter((u) => u.returned).length;
  }
  return item.returnedCount;
}