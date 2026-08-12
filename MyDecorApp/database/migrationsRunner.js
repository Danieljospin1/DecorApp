import { version } from "react";
import { GetDBConnection } from "./db";
import * as v1 from "./migrations/v1_init";

// ─── Migration Registry ───────────────────────────────────────────────────────
// Each migration must follow this shape:
//
// {
//   version: 1,                          // integer, increments by 1
//   up:   ["SQL statement", "SQL..."],   // applied going forward
//   down: ["SQL statement", "SQL..."],   // applied on rollback
// }
//
// Rules:
//   1. Never edit a migration that has already run in production
//   2. Never delete a migration from this array
//   3. Always increment version by exactly 1
//   4. Keep up and down in sync — every up action needs a down inverse

const migrations = [
    { version: 1, up: v1.up, down: v1.down },
];

// ─── Ensure migrations table exists ──────────────────────────────────────────
async function ensureMigrationsTable(db) {
    await db.execAsync(`
    CREATE TABLE IF NOT EXISTS migrations (
      version     INTEGER PRIMARY KEY NOT NULL,
      applied_at  TEXT    NOT NULL
    );
  `);
}

// ─── Get current version ──────────────────────────────────────────────────────
async function getCurrentVersion(db) {
    const row = await db.getFirstAsync(
        `SELECT version FROM migrations ORDER BY version DESC LIMIT 1;`
    );
    return row?.version ?? 0;
}

// ─── RunDBMigrations ──────────────────────────────────────────────────────────
export async function RunDBMigrations() {
    const db = await GetDBConnection();

    await ensureMigrationsTable(db);

    const currentVersion = await getCurrentVersion(db);
    const pending = migrations
        .filter(m => m.version > currentVersion)
        .sort((a, b) => a.version - b.version);

    if (pending.length === 0) {
        console.log("[migrations] Schema is up to date ✅");
        return;
    }

    console.log(`[migrations] Current version: ${currentVersion}`);
    console.log(`[migrations] Applying ${pending.length} pending migration(s)...`);

    // Must be outside any transaction to actually take effect in SQLite
    await db.execAsync("PRAGMA foreign_keys = OFF;");

    try {
        for (const migration of pending) {
            console.log(`[migrations] ➡ Applying v${migration.version}...`);

            // Each migration in its own transaction — failure rolls back only that one
            await db.withTransactionAsync(async () => {
                for (const sql of migration.up) {
                    await db.execAsync(sql);
                }

                // Stamp the version inside the same transaction —
                // if up() throws, this insert never commits
                await db.runAsync(
                    `INSERT INTO migrations (version, applied_at) VALUES (?, ?);`,
                    [migration.version, new Date().toISOString()]
                );
            });

            console.log(`[migrations] ✅ v${migration.version} applied`);
        }

        console.log("[migrations] 🎉 All migrations applied successfully!");

    } catch (error) {
        console.error("[migrations] ❌ Migration failed:", error);
        // withTransactionAsync already rolled back the failed transaction
        // Re-throw so the app knows DB setup failed and can show an error screen
        throw error;

    } finally {
        // Always re-enable foreign keys — even if migrations failed
        await db.execAsync("PRAGMA foreign_keys = ON;");
    }
}

// ─── RollbackTo ───────────────────────────────────────────────────────────────
// Rolls back all migrations down to (but not including) targetVersion.
// Example: currentVersion = 5, targetVersion = 3
//          → runs down for v5, then v4
//
// Use with caution — only for development or emergency recovery.

export async function RollbackTo(targetVersion) {
    const db = await GetDBConnection();

    await ensureMigrationsTable(db);

    const currentVersion = await getCurrentVersion(db);

    if (targetVersion >= currentVersion) {
        console.log(`[migrations] Nothing to roll back — already at v${currentVersion}`);
        return;
    }

    // Get migrations to roll back in reverse order
    const toRollback = migrations
        .filter(m => m.version > targetVersion && m.version <= currentVersion)
        .sort((a, b) => b.version - a.version); // highest first

    console.log(`[migrations] Rolling back from v${currentVersion} to v${targetVersion}...`);

    await db.execAsync("PRAGMA foreign_keys = OFF;");

    try {
        for (const migration of toRollback) {
            console.log(`[migrations] ⬇ Rolling back v${migration.version}...`);

            if (!migration.down || migration.down.length === 0) {
                throw new Error(
                    `Migration v${migration.version} has no down array — cannot rollback.`
                );
            }

            await db.withTransactionAsync(async () => {
                for (const sql of migration.down) {
                    await db.execAsync(sql);
                }

                // Remove the version stamp inside the same transaction
                await db.runAsync(
                    `DELETE FROM migrations WHERE version = ?;`,
                    [migration.version]
                );
            });

            console.log(`[migrations] ✅ v${migration.version} rolled back`);
        }

        console.log(`[migrations] 🎉 Rolled back to v${targetVersion}`);

    } catch (error) {
        console.error("[migrations] ❌ Rollback failed:", error);
        throw error;

    } finally {
        await db.execAsync("PRAGMA foreign_keys = ON;");
    }
}