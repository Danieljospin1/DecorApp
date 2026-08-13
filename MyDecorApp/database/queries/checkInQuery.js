// database/queries/checkInQuery.js
import { GetDBConnection } from "../db";
import { getBookingStatus, getDaysInfo } from "../../utils/bookingStatus";
import { formatDate, formatRWF } from "../../utils/format";
import {
  CHECK_IN_COOLDOWN_DAYS,
  PAYMENT_GRACE_DAYS,
  toLocalDateString,
  daysAgoDateString,
} from "../../utils/checkIn";

// Two independent qualifying triggers, unioned — a booking can qualify by
// EITHER, both, and the two flags returned per item tell the UI which
// expandable section(s) to render (see the check-in design discussion):
//
//   returnQualifies  = return_date is in the past AND not fully returned
//   paymentQualifies = booking is at least PAYMENT_GRACE_DAYS old AND
//                       still has a balance — independent of return_date,
//                       deliberately (a booking can owe money long before
//                       its items are even due back)
//
// Both are gated by the shared cooldown: a booking already shown within
// the last CHECK_IN_COOLDOWN_DAYS is excluded entirely, regardless of
// which trigger(s) would otherwise apply.
export async function getCheckInItems() {
  const db = getDb();

  const todayStr = toLocalDateString(new Date());
  const cooldownBoundary = daysAgoDateString(CHECK_IN_COOLDOWN_DAYS);
  const paymentThreshold = daysAgoDateString(PAYMENT_GRACE_DAYS);

  const rows = await db.getAllAsync(
    `SELECT
       b.id, b.status, b.booking_date, b.return_date,
       b.total_amount, b.amount_paid, b.last_checked_in_at,
       c.name AS client_name, c.phone AS client_phone
     FROM bookings b
     JOIN clients c ON c.id = b.client_id
     WHERE b.deleted_at IS NULL
       AND (b.last_checked_in_at IS NULL OR b.last_checked_in_at <= ?)
       AND (
             (b.return_date < ? AND b.status != 'returned')
             OR
             (b.booking_date <= ? AND (b.total_amount - b.amount_paid) > 0)
           )
     ORDER BY b.return_date ASC`,
    [cooldownBoundary, todayStr, paymentThreshold]
  );

  if (rows.length === 0) return [];

  const bookingIds = rows.map((r) => r.id);
  const placeholders = bookingIds.map(() => "?").join(",");

  // Only needed for bookings whose RETURN section will actually render,
  // but simplest and cheapest to fetch for all of them in one batched
  // query rather than branching per row.
  const clothRows = await db.getAllAsync(
    `SELECT id, booking_id, cloth_id, cloth_label, quantity, returned_count, units
     FROM booking_clothes
     WHERE booking_id IN (${placeholders})
     ORDER BY booking_id, sort_order ASC`,
    bookingIds
  );

  const clothesByBooking = {};
  for (const row of clothRows) {
    if (!clothesByBooking[row.booking_id]) clothesByBooking[row.booking_id] = [];
    clothesByBooking[row.booking_id].push({
      id: row.id, // booking_clothes UUID — same field updateBookingReturns needs
      clothId: row.cloth_id,
      label: row.cloth_label,
      quantity: row.quantity,
      returnedCount: row.returned_count,
      units: JSON.parse(row.units || "[]"),
    });
  }

  return rows.map((row) => {
    const status = getBookingStatus(row);
    const remainingAmount = Math.max(row.total_amount - row.amount_paid, 0);

    return {
      id: row.id,
      clientName: row.client_name,
      clientPhone: row.client_phone,

      status,
      returnDateFormatted: formatDate(row.return_date),
      daysInfo: getDaysInfo(row),

      // Recomputed here (not just trusted from the SQL WHERE) because the
      // UI needs them as separate booleans to decide which section(s) to
      // show — the SQL only had to prove "at least one is true".
      returnQualifies: row.return_date < todayStr && row.status !== "returned",
      paymentQualifies: row.booking_date <= paymentThreshold && remainingAmount > 0,

      clothes: clothesByBooking[row.id] || [],

      totalAmount: row.total_amount,
      amountPaid: row.amount_paid,
      remainingAmount,
      remainingAmountFormatted: formatRWF(remainingAmount),
    };
  });
}