
//
// First real migration. This is the "updated" version of the tables we
// designed earlier, with the fixes from our schema review baked in:
//   - synced_at added to every syncable table (clients was missing it)
//   - deleted_at added for soft deletes (clients, bookings, booking_photos)
//   - status CHECK constraint only allows 'active' | 'returned'
//     ('overdue' is always computed in app code, never stored)
//   - booking_photos uses deleted_at instead of updated_at (append/soft-delete only)
//   - cloth_id stays a plain TEXT slug (e.g. "ikoti"), not a UUID — it's a
//     hardcoded shared vocabulary, not a per-device generated event
//
// Assumption: schema.js now only creates the `_meta` table on first launch
// (schema_version, migration_version). Everything else — all real tables —
// lives here as version 1, so migrationRunner.js is the single source of
// truth for schema history from day one instead of splitting it across
// schema.js and migrations/.


export const up = [
    // ─── clients ──────────────────────────────────────────────────────
    `CREATE TABLE IF NOT EXISTS clients (
      id           TEXT PRIMARY KEY,                     -- UUID
      names         TEXT NOT NULL,
      phone        TEXT NOT NULL,
      type         TEXT NOT NULL DEFAULT 'Decorator'
                     CHECK (type IN ('Client', 'Decorator')),
      in_building_address TEXT,
      created_at   TEXT NOT NULL,
      updated_at   TEXT NOT NULL,
      deleted_at   TEXT,                                 -- NULL = active
      synced_at    TEXT                                  -- NULL = not yet synced
    );`,

    `CREATE INDEX IF NOT EXISTS idx_clients_phone ON clients(phone);`,
    `CREATE INDEX IF NOT EXISTS idx_clients_names  ON clients(names);`,

    // ─── bookings ─────────────────────────────────────────────────────
    `CREATE TABLE IF NOT EXISTS bookings (
      id              TEXT PRIMARY KEY,                  -- UUID
      client_id       TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      status          TEXT NOT NULL DEFAULT 'active'
                        CHECK (status IN ('active', 'returned')),
                                                           -- 'overdue' is computed, never stored
      booking_date    TEXT NOT NULL,
      return_date     TEXT NOT NULL,
      total_amount    INTEGER NOT NULL,
      amount_paid     INTEGER NOT NULL DEFAULT 0,
      notes           TEXT,
      created_at      TEXT NOT NULL,
      updated_at      TEXT NOT NULL,
      deleted_at      TEXT,
      synced_at       TEXT
    );`,

    `CREATE INDEX IF NOT EXISTS idx_bookings_client_id   ON bookings(client_id);`,
    `CREATE INDEX IF NOT EXISTS idx_bookings_status      ON bookings(status);`,
    `CREATE INDEX IF NOT EXISTS idx_bookings_return_date ON bookings(return_date);`,

    // ─── booking_clothes ──────────────────────────────────────────────
    `CREATE TABLE IF NOT EXISTS booking_clothes (
      id              TEXT PRIMARY KEY,                  -- UUID (this row = one event)
      booking_id      TEXT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
      cloth_id        TEXT NOT NULL,                      -- fixed slug, e.g. "ikoti"
      cloth_label     TEXT NOT NULL,                       -- denormalized for display
      quantity        INTEGER NOT NULL DEFAULT 1,
      returned_count  INTEGER NOT NULL DEFAULT 0,
      units           TEXT NOT NULL DEFAULT '[]',          -- JSON array
      sort_order      INTEGER NOT NULL DEFAULT 0,          -- preserves selection order
      created_at      TEXT NOT NULL,
      updated_at      TEXT NOT NULL,
      synced_at       TEXT
    );`,

    `CREATE INDEX IF NOT EXISTS idx_booking_clothes_booking_id ON booking_clothes(booking_id);`,

    // ─── booking_photos ───────────────────────────────────────────────
    `CREATE TABLE IF NOT EXISTS booking_photos (
      id              TEXT PRIMARY KEY,                  -- UUID
      booking_id      TEXT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
      local_uri       TEXT NOT NULL,
      remote_url      TEXT,
      sort_order      INTEGER NOT NULL DEFAULT 0,
      created_at      TEXT NOT NULL,
      deleted_at      TEXT,                                -- soft delete, no in-place edits
      synced_at       TEXT
    );`,

    `CREATE INDEX IF NOT EXISTS idx_booking_photos_booking_id ON booking_photos(booking_id);`,

    // ─── payment_history ──────────────────────────────────────────────
    // Append-only. Never updated, never soft-deleted.
    `CREATE TABLE IF NOT EXISTS payment_history (
      id              TEXT PRIMARY KEY,                  -- UUID
      booking_id      TEXT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
      amount          INTEGER NOT NULL,
      note            TEXT,
      paid_at         TEXT NOT NULL,
      created_at      TEXT NOT NULL,
      synced_at       TEXT
    );`,

    `CREATE INDEX IF NOT EXISTS idx_payment_history_booking_id ON payment_history(booking_id);`,
];

export const down = [
    // Reverse dependency order. Dropping a table also drops its indexes,
    // so we don't need separate DROP INDEX statements here.
    `DROP TABLE IF EXISTS payment_history;`,
    `DROP TABLE IF EXISTS booking_photos;`,
    `DROP TABLE IF EXISTS booking_clothes;`,
    `DROP TABLE IF EXISTS bookings;`,
    `DROP TABLE IF EXISTS clients;`,
];
