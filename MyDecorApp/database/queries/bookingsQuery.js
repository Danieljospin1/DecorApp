// database/queries/bookingsQuery.js
import { GetDBConnection } from "../db";
import { getBookingStatus } from "../../utils/bookingStatus";

const MAX_CARD_PHOTOS = 3;
const MAX_ITEM_LABELS_SHOWN = 2;

const STATUS_LABEL = {
  active: "Not yet returned",
  overdue: "Overdue",
  returned: "Returned",
};

// Returns bookings already shaped for BookingsScreen to render directly —
// no math or string-building left for the screen to do:
//
//   {
//     id, clientName,
//     status: 'active' | 'overdue' | 'returned',   // resolved, never raw DB enum
//     statusLabel: 'Not yet returned' | 'Overdue' | 'Returned',
//     remainingAmount, isFullyPaid, paymentText,     // "20,000 RWF due" / "Fully paid" — screen just displays this
//     itemsSummary,                                   // e.g. "Gown, Ikoti +1 more"
//     photos,                                         // up to 3 local_uri strings, in order
//   }
//
// Deliberately does NOT include icon names or hex colors — which icon or
// color represents "overdue" is a presentation choice, not a data one, and
// belongs in the screen so this file stays reusable for anything else that
// needs a bookings list (e.g. a future export or notifications feature)
// without dragging UI decisions along with it.
//
// Sorted latest-created first (per your instruction) — no urgency-based
// re-sorting here. If you want overdue bookings pinned to the top on top
// of that later, that's a one-line change to the ORDER BY / a .sort() pass.
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
  // NOTE: doesn't check c.deleted_at — client soft-delete isn't a built
  // feature yet, so this can't happen today. Revisit if it becomes one, so
  // a deleted client's old bookings don't quietly disappear from history.

  if (bookingRows.length === 0) return [];

  const bookingIds = bookingRows.map((row) => row.id);
  const placeholders = bookingIds.map(() => "?").join(",");

  // Two extra queries total, not one per booking (avoids N+1), grouped in
  // JS afterward. Simple to read and doesn't depend on SQLite's JSON1
  // extension being available on the device.
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
     WHERE booking_id IN (${placeholders}) AND deleted_at IS NULL
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
  const remainingAmount = Math.max(row.total_amount - row.amount_paid, 0);
  const isFullyPaid = remainingAmount === 0;

  return {
    id: row.id,
    clientName: row.client_name,
    status,
    statusLabel: STATUS_LABEL[status],
    remainingAmount,
    isFullyPaid,
    paymentText: isFullyPaid
      ? "Fully paid"
      : `${remainingAmount.toLocaleString()} RWF due`,
    itemsSummary: buildItemsLabel(clothRows.map((c) => c.cloth_label)),
    photos: photoRows.slice(0, MAX_CARD_PHOTOS).map((p) => p.local_uri),
  };
}

function buildItemsLabel(labels) {
  if (labels.length === 0) return "No items";
  if (labels.length <= MAX_ITEM_LABELS_SHOWN) return labels.join(", ");
  return `${labels.slice(0, MAX_ITEM_LABELS_SHOWN).join(", ")} +${
    labels.length - MAX_ITEM_LABELS_SHOWN
  } more`;
}

function groupBy(rows, key) {
  return rows.reduce((acc, row) => {
    const k = row[key];
    if (!acc[k]) acc[k] = [];
    acc[k].push(row);
    return acc;
  }, {});
}