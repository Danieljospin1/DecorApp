// database/queries/deleteBookingQuery.js
import { GetDBConnection } from "../db";

// Soft delete only — never a hard DELETE — same reasoning as clients/
// bookings/booking_photos everywhere else in the schema: the deleted_at
// column exists specifically so a future sync can still reconcile this
// booking with a server copy instead of the row just vanishing locally
// with no trace.
//
// booking_clothes has no deleted_at of its own (unlike bookings/clients/
// booking_photos) — it doesn't need one. Every query that reads
// booking_clothes only ever gets there by joining through a booking_id
// whose parent bookings row is itself checked against deleted_at IS NULL
// (see getBookingDetails). Once the parent booking is soft-deleted, its
// clothes rows become unreachable through the app the same way — there's
// no separate "clothes still visible, booking gone" state to guard against.
//
// payment_history is append-only and is left completely untouched — it's
// a historical ledger, not something a delete should ever rewrite.
//
// Photo files on disk are also left alone, matching the same reasoning
// used for photo removal in updateBookingPhotos: hard-deleting the actual
// files immediately would race a future sync that might still need them.
// Physical cleanup of soft-deleted bookings' files belongs in a separate
// sync-aware job, not in this mutation.
export async function deleteBooking(bookingId) {
  const db = await GetDBConnection();
  const now = new Date().toISOString();

  const booking = await db.getFirstAsync(
    `SELECT id FROM bookings WHERE id = ? AND deleted_at IS NULL`,
    [bookingId]
  );

  if (!booking) {
    throw new Error("This booking no longer exists.");
  }

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `UPDATE bookings
       SET deleted_at = ?, updated_at = ?, synced_at = NULL
       WHERE id = ?`,
      [now, now, bookingId]
    );

    await db.runAsync(
      `UPDATE booking_photos
       SET deleted_at = ?, synced_at = NULL
       WHERE booking_id = ? AND deleted_at IS NULL`,
      [now, bookingId]
    );
  });
}