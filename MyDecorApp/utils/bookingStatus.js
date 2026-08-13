// database/utils/bookingStatus.js
//
// Single source of truth for resolving a booking's real status. 'overdue'
// is never stored in the bookings table (see the CHECK constraint in
// 001_initial_schema, and the earlier discussion on BookingDetailsScreen)
// — it's always computed here from stored 'active'/'returned' + return_date
// compared to today. Every query file and screen should call this instead
// of keeping its own copy, so they can never silently disagree about
// whether a booking is overdue.
export function getBookingStatus(booking) {
  if (booking.status === "returned") return "returned";

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const ret = new Date(booking.return_date);
  ret.setHours(0, 0, 0, 0);

  return ret < today ? "overdue" : "active";
}

// Day-count + urgency type for a booking's return date. 'type' is a
// semantic classification ('ok' | 'warning' | 'overdue'), not a color —
// screens decide what color/icon each type maps to, same split used for
// status everywhere else.
//
// NOTE: the original BookingDetailsScreen mixed English text for 'ok'/
// 'warning' with Kinyarwanda text for 'overdue' ("Iminsi/Umunsi N irenzeho
// ku itariki yo gutarura"). Normalized to English here — if the app needs
// Kinyarwanda, it should be ALL of these labels via one i18n approach, not
// one branch translated and the others not.
export function getDaysInfo(booking) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const ret = new Date(booking.return_date);
  ret.setHours(0, 0, 0, 0);
  const diffDays = Math.round((ret - today) / 86400000);

  if (diffDays > 0) {
    return { label: `${diffDays} day${diffDays === 1 ? "" : "s"} remaining`, type: "ok" };
  }
  if (diffDays === 0) {
    return { label: "Due today", type: "warning" };
  }
  const overdueDays = Math.abs(diffDays);
  return { label: `${overdueDays} day${overdueDays === 1 ? "" : "s"} overdue`, type: "overdue" };
}