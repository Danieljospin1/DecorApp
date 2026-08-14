// database/queries/updateBookingNotes.js
import { GetDBConnection } from "../db";

// Notes has no real validation to speak of — any string, including empty,
// is valid (empty means "user cleared their notes"). Trimming is the only
// normalization worth doing, so a note that's just whitespace is stored
// as NULL rather than as an invisible non-empty string that would make
// the section wrongly think it has content to show.
export async function updateBookingNotes(bookingId, notes) {
  const db = await GetDBConnection();
  const now = new Date().toISOString();

  const trimmed = (notes || "").trim();

  await db.runAsync(
    `UPDATE bookings
     SET notes = ?, updated_at = ?, synced_at = NULL
     WHERE id = ?`,
    [trimmed === "" ? null : trimmed, now, bookingId]
  );
}