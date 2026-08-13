// database/queries/updateBookingPayment.js
import * as Crypto from "expo-crypto";
import { GetDBConnection } from "../db";

// Updates total/paid on a booking and logs the change to payment_history —
// in EITHER direction. The dummy screen only logged increases
// (`if (newPaid > amountPaid)`), which quietly breaks the schema's own
// documented invariant — SUM(payment_history.amount) WHERE booking_id = x
// should always equal bookings.amount_paid — the first time someone
// corrects an over-entered payment downward. Logging the delta regardless
// of sign keeps that invariant true always, not just on the happy path.
//
// Not responsible for the very first "Initial deposit" history row — that
// belongs to whatever creates the booking (saveBooking, not built yet),
// since this function only knows about a booking that already exists.
export async function updateBookingPayment(bookingId, { totalAmount, amountPaid, note }) {
  if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
    throw new Error("Total amount must be greater than 0.");
  }
  if (!Number.isFinite(amountPaid) || amountPaid < 0) {
    throw new Error("Amount paid cannot be negative.");
  }
  if (amountPaid > totalAmount) {
    throw new Error("Amount paid cannot exceed total amount.");
  }

  const db = await GetDBConnection();
  const now = new Date().toISOString();

  await db.withTransactionAsync(async () => {
    const current = await db.getFirstAsync(
      `SELECT amount_paid FROM bookings WHERE id = ? AND deleted_at IS NULL`,
      [bookingId]
    );
    if (!current) {
      throw new Error("Booking not found.");
    }

    const delta = amountPaid - current.amount_paid;

    if (delta !== 0) {
      const defaultNote = delta > 0 ? "Payment recorded" : "Payment correction";
      await db.runAsync(
        `INSERT INTO payment_history (id, booking_id, amount, note, paid_at, created_at, synced_at)
         VALUES (?, ?, ?, ?, ?, ?, NULL)`,
        [Crypto.randomUUID(), bookingId, delta, note ?? defaultNote, now, now]
      );
    }

    await db.runAsync(
      `UPDATE bookings
       SET total_amount = ?, amount_paid = ?, updated_at = ?, synced_at = NULL
       WHERE id = ?`,
      [totalAmount, amountPaid, now, bookingId]
    );
  });
}