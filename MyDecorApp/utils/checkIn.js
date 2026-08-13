// /utils/checkIn.js

// How long a booking stays quiet after being shown in a check-in, before
// it's eligible to reappear.
export const CHECK_IN_COOLDOWN_DAYS = 3;

// How long after a booking is CREATED before an unpaid balance starts
// showing up in check-ins — independent of return_date entirely (see the
// check-in design discussion: a booking can owe money long before its
// items are even due back).
export const PAYMENT_GRACE_DAYS = 7;

// Local calendar date as YYYY-MM-DD. Deliberately NOT date.toISOString()
// (UTC) and NOT SQLite's date('now') (also UTC) — Rwanda is UTC+2 with no
// DST, so a UTC-based "today" can disagree with the vendor's actual
// calendar day for several hours around midnight. Every "today" in the
// check-in feature comes from the device's local clock via this function,
// never from SQL.
export function toLocalDateString(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function daysAgoDateString(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return toLocalDateString(d);
}