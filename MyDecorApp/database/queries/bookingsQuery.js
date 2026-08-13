// database/queries/bookingsQuery.js
import { GetDBConnection } from "../db";
import { getBookingStatus } from "../../utils/bookingStatus";

const MAX_CARD_PHOTOS = 3;
const MAX_ITEM_LABELS_SHOWN = 2;


// Returns bookings already shaped for BookingsScreen.
//
// Status text is contextual:
//
// active:
//   - "Due today"
//   - "Due tomorrow"
//   - "Returns Aug 18"
//
// overdue:
//   - "1 day late"
//   - "3 days late"
//
// returned:
//   - "Yarataruwe"
//
export async function getBookingsList() {
  const db = await GetDBConnection();

  const bookingRows = await db.getAllAsync(`
    SELECT
      b.id,
      b.status,
      b.return_date,
      b.total_amount,
      b.amount_paid,
      b.created_at,
      c.names AS client_name
    FROM bookings b
    JOIN clients c ON c.id = b.client_id
    WHERE b.deleted_at IS NULL
    ORDER BY b.created_at DESC
  `);

  if (bookingRows.length === 0) return [];

  const bookingIds = bookingRows.map((row) => row.id);
  const placeholders = bookingIds.map(() => "?").join(",");

  const clothRows = await db.getAllAsync(
    `SELECT booking_id, cloth_label
     FROM booking_clothes
     WHERE booking_id IN (${placeholders})
     ORDER BY booking_id, sort_order ASC`,
    bookingIds
  );

  const photoRows = await db.getAllAsync(
    `SELECT booking_id, local_uri
     FROM booking_photos
     WHERE booking_id IN (${placeholders})
       AND deleted_at IS NULL
     ORDER BY booking_id, sort_order ASC`,
    bookingIds
  );

  const clothesByBooking = groupBy(clothRows, "booking_id");
  const photosByBooking = groupBy(photoRows, "booking_id");

  return bookingRows.map((row) =>
    formatBookingRow(
      row,
      clothesByBooking[row.id] || [],
      photosByBooking[row.id] || []
    )
  );
}


function formatBookingRow(row, clothRows, photoRows) {
  const status = getBookingStatus(row);

  const remainingAmount = Math.max(
    row.total_amount - row.amount_paid,
    0
  );

  const isFullyPaid = remainingAmount === 0;

  return {
    id: row.id,
    clientName: row.client_name,

    status,

    // Context-aware instead of static status labels
    statusLabel: getStatusLabel(status, row.return_date),

    remainingAmount,
    isFullyPaid,

    paymentText: isFullyPaid
      ? "Fully paid"
      : `${remainingAmount.toLocaleString()} RWF due`,

    itemsSummary: buildItemsLabel(
      clothRows.map((c) => c.cloth_label)
    ),

    photos: photoRows
      .slice(0, MAX_CARD_PHOTOS)
      .map((p) => p.local_uri),
  };
}


/**
 * Creates the compact, useful text shown beside the booking.
 *
 * Examples:
 *
 * returned:
 *   "Yarataruwe"
 *
 * active:
 *   "Due today"
 *   "Due tomorrow"
 *   "Returns 8/18"
 *
 * overdue:
 *   "1 day late"
 *   "3 days late"
 */
function getStatusLabel(status, returnDate) {
  if (status === "returned") {
    return "Yarataruwe";
  }

  const today = startOfDay(new Date());
  const returnDay = startOfDay(new Date(returnDate));

  const daysDifference = getDaysDifference(today, returnDay);

  // Return date is today
  if (daysDifference === 0) {
    return "Today";
  }

  // Return date is tomorrow
  if (daysDifference === 1) {
    return "Tomorrow";
  }

  // Return date has passed
  if (status === "overdue") {
    const daysLate = Math.abs(daysDifference);

    return daysLate === 1
      ? "1 day late"
      : `${daysLate} days late`;
  }

  // Future return date
  return `${formatShortDate(returnDay)}`;
}


/**
 * Removes the time portion so date comparisons are based only
 * on calendar days.
 */
function startOfDay(date) {
  const result = new Date(date);

  result.setHours(0, 0, 0, 0);

  return result;
}


/**
 * Returns:
 *
 *  1  → tomorrow
 *  5  → 5 days from now
 * -3  → 3 days ago
 */
function getDaysDifference(from, to) {
  const MS_PER_DAY = 1000 * 60 * 60 * 24;

  return Math.round(
    (to.getTime() - from.getTime()) / MS_PER_DAY
  );
}


/**
 * Example:
 *
 * 8/18
 */
function formatShortDate(date) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "numeric",
    

  }).format(date);
}


function buildItemsLabel(labels) {
  if (labels.length === 0) {
    return "No items";
  }

  if (labels.length <= MAX_ITEM_LABELS_SHOWN) {
    return labels.join(", ");
  }

  return `${labels
    .slice(0, MAX_ITEM_LABELS_SHOWN)
    .join(", ")} +${labels.length - MAX_ITEM_LABELS_SHOWN} more`;
}


function groupBy(rows, key) {
  return rows.reduce((acc, row) => {
    const k = row[key];

    if (!acc[k]) {
      acc[k] = [];
    }

    acc[k].push(row);

    return acc;
  }, {});
}