// database/migrations/002_add_check_in_tracking.js
//
// Adds last_checked_in_at to bookings — stamped whenever a booking is
// shown in a daily check-in (see database/mutations/markCheckedIn.js),
// regardless of whether the vendor resolved it, left it "still pending",
// or dismissed the whole sheet. Stored as a plain YYYY-MM-DD date string
// (not a full ISO timestamp like created_at/updated_at) — the check-in
// feature only ever reasons in whole calendar days, and mixing a
// date-only comparison boundary against a full-timestamp column would
// compare incorrectly (a same-day full timestamp sorts AFTER the
// date-only string it should be considered equal to).


  export const up = [
    `ALTER TABLE bookings ADD COLUMN last_checked_in_at TEXT;`,
  ];

  export const down = [
    // SQLite's DROP COLUMN support is version-dependent, so this follows
    // the same backup/rename pattern as the project's own migration
    // template (001_example_migration.js) rather than relying on it.
    // NOTE: like that template, this doesn't preserve CHECK constraints —
    // an existing limitation of the pattern, not new here.
    `CREATE TABLE bookings_backup AS
     SELECT id, client_id, status, booking_date, return_date,
            total_amount, amount_paid, notes,
            created_at, updated_at, deleted_at, synced_at
     FROM bookings;`,
    `DROP TABLE bookings;`,
    `ALTER TABLE bookings_backup RENAME TO bookings;`,
    // CREATE TABLE ... AS SELECT drops indexes too — recreate them.
    `CREATE INDEX IF NOT EXISTS idx_bookings_client_id ON bookings(client_id);`,
    `CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);`,
    `CREATE INDEX IF NOT EXISTS idx_bookings_return_date ON bookings(return_date);`,
  ];
