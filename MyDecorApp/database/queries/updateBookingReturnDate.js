// database/queries/updateBookingReturnDate.js
import { GetDBConnection } from "../db";

// booking_date is intentionally untouched by this mutation — it's a
// historical fact once a booking exists, not something to revise. Only
// return_date is ever edited here, e.g. extending a rental.
//
// Validation lives here only, per convention #12 — the screen just
// catches err.message and displays it.
export async function updateBookingReturnDate(bookingId, newReturnDate) {
  const db = await GetDBConnection();
  const now = new Date().toISOString();

  const booking = await db.getFirstAsync(
    `SELECT booking_date FROM bookings WHERE id = ? AND deleted_at IS NULL`,
    [bookingId]
  );

  if (!booking) {
    throw new Error("Booking not found.");
  }

  // Both sides are YYYY-MM-DD strings — directly string-comparable, per
  // the schema's date-only convention (see handoff doc §5).
  if (newReturnDate < booking.booking_date) {
    throw new Error("Return date can't be before the booking date.");
  }

  await db.runAsync(
    `UPDATE bookings
     SET return_date = ?, updated_at = ?, synced_at = NULL
     WHERE id = ?`,
    [newReturnDate, now, bookingId]
  );
}