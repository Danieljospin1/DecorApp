// database/queries/bookingDetailsQuery.js
import {GetDBConnection} from "../db";
import { getBookingStatus, getDaysInfo } from "../../utils/bookingStatus";
import { formatDate, formatRWF, formatBookingCode } from "../../utils/format";

// Deliberately worded differently from bookingsQuery.js's STATUS_LABEL
// ("Not yet returned" there vs "Active" here) — the list and details
// screens want different tones for the same underlying status, and that's
// a legitimate per-screen choice, not drift to fix.
const STATUS_LABEL = {
  active: "Active",
  overdue: "Overdue",
  returned: "Returned",
};

// Returns everything BookingDetailsScreen needs to render, already
// formatted — dates as DD/MM/YYYY, amounts with thousands separators, days-
// remaining as finished text. Returns null if the booking doesn't exist
// (soft-deleted or bad id) so the screen can decide how to handle that
// (e.g. navigate back with an alert) rather than crashing on undefined.
export async function getBookingDetails(bookingId) {
  const db = await GetDBConnection();

  const booking = await db.getFirstAsync(
    `SELECT
       b.id, b.status, b.booking_date, b.return_date,
       b.total_amount, b.amount_paid, b.notes,
       c.names AS client_name, c.phone AS client_phone, c.type AS client_type, c.in_building_address AS client_address
     FROM bookings b
     JOIN clients c ON c.id = b.client_id
     WHERE b.id = ? AND b.deleted_at IS NULL`,
    [bookingId]
  );

  if (!booking) return null;

  const clothRows = await db.getAllAsync(
    `SELECT id, cloth_id, cloth_label, quantity, returned_count, units
     FROM booking_clothes
     WHERE booking_id = ?
     ORDER BY sort_order ASC`,
    [bookingId]
  );

  const photoRows = await db.getAllAsync(
    `SELECT local_uri
     FROM booking_photos
     WHERE booking_id = ? AND deleted_at IS NULL
     ORDER BY sort_order ASC`,
    [bookingId]
  );

  const historyRows = await db.getAllAsync(
    `SELECT id, amount, note, paid_at
     FROM payment_history
     WHERE booking_id = ?
     ORDER BY paid_at ASC`,
    [bookingId]
  );

  const status = getBookingStatus(booking);
  const remainingAmount = Math.max(booking.total_amount - booking.amount_paid, 0);
  const fullyPaid = remainingAmount === 0;

  return {
    id: booking.id,
    displayCode: formatBookingCode(booking.id), // "BK-A1B2C3D4" — display only, never use for lookups

    clientName: booking.client_name,
    clientPhone: booking.client_phone,
    clientType: booking.client_type,
    clientAddress: booking.client_address,

    status,
    statusLabel: STATUS_LABEL[status],

    // Raw ISO kept alongside the formatted string — the edit/prefill flow
    // into NewBookingScreen needs the real value, not "29/07/2026" text.
    bookingDate: booking.booking_date,
    returnDate: booking.return_date,
    bookingDateFormatted: formatDate(booking.booking_date),
    returnDateFormatted: formatDate(booking.return_date),
    daysInfo: getDaysInfo(booking),

    notes: booking.notes,

    // `id` here is the booking_clothes row's own UUID, NOT cloth_id
    // ("gown", "ikoti", ...). The dummy screen used cloth_id as if it were
    // unique per booking, which happens to work only because no booking
    // has ever had two rows with the same cloth_id — using the real row id
    // is what updateBookingReturns() below actually needs to target the
    // correct row unambiguously.
    clothes: clothRows.map((row) => ({
      id: row.id,
      clothId: row.cloth_id,
      label: row.cloth_label,
      quantity: row.quantity,
      returnedCount: row.returned_count,
      units: JSON.parse(row.units || "[]"),
    })),

    photos: photoRows.map((r) => r.local_uri),

    totalAmount: booking.total_amount,
    amountPaid: booking.amount_paid,
    remainingAmount,
    fullyPaid,
    totalAmountFormatted: formatRWF(booking.total_amount),
    amountPaidFormatted: formatRWF(booking.amount_paid),
    remainingAmountFormatted: formatRWF(remainingAmount),

    paymentHistory: historyRows.map((h) => ({
      id: h.id,
      amount: h.amount, // signed — negative for downward corrections
      amountFormatted: formatRWF(Math.abs(h.amount)), // magnitude only; screen adds the +/- sign
      note: h.note,
      dateFormatted: formatDate(h.paid_at),
    })),
  };
}