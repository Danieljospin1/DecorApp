/**
 * Update booking query functions
 * 
 * Handles:
 * - Updating booking clothes (add/remove/modify)
 * - Updating booking dates
 * - Updating booking notes
 * - Updating client info (in_building_address for decorators)
 */

import { GetDBConnection } from "../db";
import { randomUUID } from "expo-crypto";

/**
 * Normalize text input.
 * null / undefined / empty spaces become an empty string.
 */
function normalizeText(value) {
  return String(value ?? "").trim();
}

/**
 * Convert a Date object into a stable database format.
 * Example: 2026-08-12
 */
function formatDateForDB(date) {
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    throw new Error("Invalid date");
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

/**
 * Returns an ISO timestamp.
 */
function now() {
  return new Date().toISOString();
}

/**
 * Update booking basic info (dates, notes, client address)
 * 
 * @param {string} bookingId
 * @param {Object} updates - { returnDate?, bookingDate?, notes?, clientAddress? }
 */
export async function updateBookingBasicInfo(bookingId, updates) {
  const db = await GetDBConnection();
  const { returnDate, bookingDate, notes, clientAddress } = updates;
  const timestamp = now();

  try {
    // Validate dates if provided
    if (bookingDate && (!(bookingDate instanceof Date) || isNaN(bookingDate.getTime()))) {
      throw new Error("Invalid booking date.");
    }
    if (returnDate && (!(returnDate instanceof Date) || isNaN(returnDate.getTime()))) {
      throw new Error("Invalid return date.");
    }

    // If both dates provided, validate return date is after booking date
    if (bookingDate && returnDate && returnDate < bookingDate) {
      throw new Error("Return date cannot be before booking date.");
    }

    await db.execAsync("BEGIN TRANSACTION;");

    try {
      // Update booking dates and notes
      const updates_array = [];
      const update_cols = [];

      if (bookingDate) {
        update_cols.push("booking_date = ?");
        updates_array.push(formatDateForDB(bookingDate));
      }

      if (returnDate) {
        update_cols.push("return_date = ?");
        updates_array.push(formatDateForDB(returnDate));
      }

      if (notes !== undefined) {
        update_cols.push("notes = ?");
        updates_array.push(normalizeText(notes) || null);
      }

      if (update_cols.length > 0) {
        update_cols.push("updated_at = ?");
        updates_array.push(timestamp);
        updates_array.push(bookingId);

        await db.runAsync(
          `UPDATE bookings SET ${update_cols.join(", ")} WHERE id = ?;`,
          updates_array
        );
      }

      // Update client address if provided
      if (clientAddress !== undefined) {
        // Get the client_id first
        const booking = await db.getFirstAsync(
          `SELECT client_id FROM bookings WHERE id = ?`,
          [bookingId]
        );

        if (booking) {
          await db.runAsync(
            `UPDATE clients SET in_building_address = ?, updated_at = ? WHERE id = ?;`,
            [normalizeText(clientAddress) || null, timestamp, booking.client_id]
          );
        }
      }

      await db.execAsync("COMMIT;");

      return {
        success: true,
        message: "Booking updated successfully",
      };

    } catch (dbError) {
      await db.execAsync("ROLLBACK;");
      throw dbError;
    }

  } catch (error) {
    console.error("[updateBookingQuery] Failed to update booking basic info:", error);
    throw error;
  }
}

/**
 * Add a new cloth to an existing booking
 * 
 * @param {string} bookingId
 * @param {Object} cloth - { label, quantity, units? }
 */
export async function addClothToBooking(bookingId, cloth) {
  const db = await GetDBConnection();
  const timestamp = now();

  try {
    if (!cloth.label || !cloth.quantity || cloth.quantity < 1) {
      throw new Error("Invalid cloth data");
    }

    // Get the max sort_order for this booking
    const lastCloth = await db.getFirstAsync(
      `SELECT MAX(sort_order) as max_order FROM booking_clothes WHERE booking_id = ?`,
      [bookingId]
    );

    const sortOrder = (lastCloth?.max_order ?? -1) + 1;
    const units = Array.isArray(cloth.units) ? cloth.units : [];

    await db.runAsync(
      `
      INSERT INTO booking_clothes (
        id,
        booking_id,
        cloth_id,
        cloth_label,
        quantity,
        returned_count,
        units,
        sort_order,
        created_at,
        updated_at,
        synced_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL);
      `,
      [
        randomUUID(),
        bookingId,
        cloth.id || `custom_${Date.now()}`,
        normalizeText(cloth.label),
        cloth.quantity,
        0,
        JSON.stringify(units),
        sortOrder,
        timestamp,
        timestamp,
      ]
    );

    return {
      success: true,
      message: "Cloth added to booking",
    };

  } catch (error) {
    console.error("[updateBookingQuery] Failed to add cloth:", error);
    throw error;
  }
}

/**
 * Update a cloth in a booking
 * 
 * @param {string} clothRowId - The booking_clothes row ID
 * @param {Object} updates - { label?, quantity?, units? }
 */
export async function updateClothInBooking(clothRowId, updates) {
  const db = await GetDBConnection();
  const timestamp = now();

  try {
    const { label, quantity, units } = updates;

    if (quantity && quantity < 1) {
      throw new Error("Quantity must be at least 1");
    }

    const update_cols = [];
    const values = [];

    if (label) {
      update_cols.push("cloth_label = ?");
      values.push(normalizeText(label));
    }

    if (quantity) {
      update_cols.push("quantity = ?");
      values.push(quantity);
    }

    if (units) {
      update_cols.push("units = ?");
      values.push(JSON.stringify(units));
    }

    if (update_cols.length > 0) {
      update_cols.push("updated_at = ?");
      values.push(timestamp);
      values.push(clothRowId);

      await db.runAsync(
        `UPDATE booking_clothes SET ${update_cols.join(", ")} WHERE id = ?;`,
        values
      );
    }

    return {
      success: true,
      message: "Cloth updated",
    };

  } catch (error) {
    console.error("[updateBookingQuery] Failed to update cloth:", error);
    throw error;
  }
}

/**
 * Delete a cloth from a booking
 * 
 * @param {string} clothRowId - The booking_clothes row ID
 */
export async function deleteClothFromBooking(clothRowId) {
  const db = await GetDBConnection();

  try {
    await db.runAsync(
      `DELETE FROM booking_clothes WHERE id = ?;`,
      [clothRowId]
    );

    return {
      success: true,
      message: "Cloth removed from booking",
    };

  } catch (error) {
    console.error("[updateBookingQuery] Failed to delete cloth:", error);
    throw error;
  }
}

/**
 * Batch update multiple clothes (reorder, update multiple at once)
 * 
 * @param {string} bookingId
 * @param {Array} clothesData - Array of { id, label, quantity, units }
 */
export async function updateClothesInBooking(bookingId, clothesData) {
  const db = await GetDBConnection();
  const timestamp = now();

  try {
    await db.execAsync("BEGIN TRANSACTION;");

    try {
      // Delete all existing clothes for this booking
      await db.runAsync(
        `DELETE FROM booking_clothes WHERE booking_id = ?;`,
        [bookingId]
      );

      // Insert updated clothes
      for (let i = 0; i < clothesData.length; i++) {
        const cloth = clothesData[i];
        const units = Array.isArray(cloth.units) ? cloth.units : [];

        await db.runAsync(
          `
          INSERT INTO booking_clothes (
            id,
            booking_id,
            cloth_id,
            cloth_label,
            quantity,
            returned_count,
            units,
            sort_order,
            created_at,
            updated_at,
            synced_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL);
          `,
          [
            cloth.id || randomUUID(),
            bookingId,
            cloth.clothId || `custom_${Date.now()}_${i}`,
            normalizeText(cloth.label),
            cloth.quantity,
            cloth.returnedCount || 0,
            JSON.stringify(units),
            i,
            timestamp,
            timestamp,
          ]
        );
      }

      await db.execAsync("COMMIT;");

      return {
        success: true,
        message: "Clothes updated successfully",
      };

    } catch (dbError) {
      await db.execAsync("ROLLBACK;");
      throw dbError;
    }

  } catch (error) {
    console.error("[updateBookingQuery] Failed to update clothes:", error);
    throw error;
  }
}
