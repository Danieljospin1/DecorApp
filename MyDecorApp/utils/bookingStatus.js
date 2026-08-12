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