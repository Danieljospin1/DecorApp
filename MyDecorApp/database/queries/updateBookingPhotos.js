// database/queries/updateBookingPhotos.js
import { GetDBConnection } from "../db";
import * as Crypto from "expo-crypto";
import { saveBookingImages } from "../../utils/fileHandler";

// Adds new photos and/or soft-deletes existing ones for a booking, in one
// call. `addUris` are raw picker URIs still living in the OS's volatile
// image-picker cache — saveBookingImages() copies them into permanent app
// storage before any DB row is written, exactly like createBooking() does
// for a brand new booking.
//
// Removal is a soft delete (deleted_at), matching booking_photos' existing
// convention. The physical file is deliberately left on disk here rather
// than deleted — hard-deleting immediately would race a future sync: if a
// server copy exists and sync hasn't run yet, the local file may still be
// needed to resolve that later. Physical cleanup of soft-deleted files
// belongs in a separate sync-aware job, not in this mutation.
export async function updateBookingPhotos(bookingId, { addUris = [], removeIds = [] } = {}) {
  const db = await GetDBConnection();
  const now = new Date().toISOString();

  // File copy happens outside the SQLite transaction — it's slow
  // filesystem I/O, not something a DB rollback could undo anyway, so it
  // shouldn't hold a transaction open.
  const savedUris = addUris.length > 0 ? await saveBookingImages(addUris) : [];

  await db.withTransactionAsync(async () => {
    if (removeIds.length > 0) {
      const placeholders = removeIds.map(() => "?").join(",");
      await db.runAsync(
        `UPDATE booking_photos
         SET deleted_at = ?, synced_at = NULL
         WHERE id IN (${placeholders}) AND booking_id = ?`,
        [now, ...removeIds, bookingId]
      );
    }

    if (savedUris.length > 0) {
      const row = await db.getFirstAsync(
        `SELECT COALESCE(MAX(sort_order), -1) AS maxOrder
         FROM booking_photos
         WHERE booking_id = ?`,
        [bookingId]
      );
      let nextOrder = row.maxOrder + 1;

      for (const uri of savedUris) {
        await db.runAsync(
          `INSERT INTO booking_photos (id, booking_id, local_uri, sort_order, created_at, synced_at)
           VALUES (?, ?, ?, ?, ?, NULL)`,
          [Crypto.randomUUID(), bookingId, uri, nextOrder, now]
        );
        nextOrder += 1;
      }
    }
  });
}