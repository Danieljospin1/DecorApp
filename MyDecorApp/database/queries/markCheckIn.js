// database/mutations/markCheckedIn.js
import { GetDBConnection } from "../db";
import { toLocalDateString } from "../../utils/checkIn";

// Stamps every booking that was part of a check-in surface the vendor
// actually saw — whether they resolved anything, left items "still
// pending", or dismissed the whole sheet outright. Being SHOWN is what
// starts the cooldown, not being resolved — that's what guarantees a
// cancelled sheet won't reappear again later the same day (see the
// check-in design discussion).
export async function markCheckedIn(bookingIds) {
  if (!bookingIds || bookingIds.length === 0) return;

  const db = await GetDBConnection();
  const today = toLocalDateString(new Date());
  const placeholders = bookingIds.map(() => "?").join(",");

  await db.runAsync(
    `UPDATE bookings SET last_checked_in_at = ? WHERE id IN (${placeholders})`,
    [today, ...bookingIds]
  );
}