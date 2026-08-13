// database/utils/format.js
//
// formatDate accepts either a Date or an ISO string directly — DB rows come
// back as ISO strings (see schema: all dates stored as TEXT), so callers
// shouldn't have to wrap every field in `new Date(...)` themselves.
export function formatDate(isoOrDate) {
  const date = isoOrDate instanceof Date ? isoOrDate : new Date(isoOrDate);
  const d = String(date.getDate()).padStart(2, "0");
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
}

export function formatRWF(amount) {
  return amount.toLocaleString("en-US");
}

// Short, human-friendly reference derived from the UUID — NOT a stored
// column, just a display convenience. Not guaranteed globally unique on
// its own (8 hex chars is ~4 billion combinations, collision risk is
// negligible for a single vendor's booking list, but this is display-only;
// never use this for lookups — always query by the real `id`).
export function formatBookingCode(id) {
  return `BK-${id.slice(0, 8).toUpperCase()}`;
}