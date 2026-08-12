import { GetDBConnection } from "../db";
import { randomUUID } from "expo-crypto";
import { saveBookingImages } from "../../utils/fileHandler";


/**
 * Convert a Date object into a stable database format.
 *
 * Example:
 * 2026-08-12
 *
 * We store dates as YYYY-MM-DD instead of:
 * - locale strings
 * - DD/MM/YYYY
 * - Date.toString()
 *
 * This makes comparison and sorting predictable.
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
 * Normalize text input.
 *
 * null / undefined / empty spaces become an empty string.
 */
function normalizeText(value) {
  return String(value ?? "").trim();
}


/**
 * Normalize a phone number.
 *
 * This currently removes spaces, hyphens and parentheses.
 *
 * Examples:
 * 0788 123 456
 * 0788-123-456
 *
 * becomes:
 *
 * 0788123456
 *
 * Do not try to aggressively convert the number to an
 * international format here unless you define a phone-number
 * policy for the whole application.
 */
function normalizePhone(phone) {
  return normalizeText(phone).replace(/[\s()-]/g, "");
}


/**
 * Convert a money input into an integer.
 *
 * The database stores RWF as INTEGER.
 */
function parseMoney(value, fieldName) {
  const normalized = normalizeText(value).replace(/,/g, "");

  if (normalized === "") {
    return 0;
  }

  const amount = Number(normalized);

  if (!Number.isFinite(amount)) {
    throw new Error(`${fieldName} must be a valid number.`);
  }

  if (amount < 0) {
    throw new Error(`${fieldName} cannot be negative.`);
  }

  if (!Number.isInteger(amount)) {
    throw new Error(`${fieldName} must be a whole number.`);
  }

  return amount;
}


/**
 * Validate and normalize the data coming from NewBookingScreen.
 *
 * This function does NOT save anything.
 *
 * It returns clean data ready for database insertion.
 */
function validateAndFormatBookingData(data) {
  const {
    clientType,
    clientName,
    phone,
    address,
    selectedClothTypes,
    bookingImages,
    bookingDate,
    returnDate,
    totalAmount,
    amountPaid,
  } = data;


  // ─── Client ─────────────────────────────────────────────────────

  const names = normalizeText(clientName);
  const normalizedPhone = normalizePhone(phone);
  const normalizedAddress = normalizeText(address);

  if (!names) {
    throw new Error("Client name is required.");
  }

  if (!normalizedPhone) {
    throw new Error("Phone number is required.");
  }

  if (
    clientType !== "Client" &&
    clientType !== "Decorator"
  ) {
    throw new Error("Invalid client type.");
  }


  // ─── Clothes ────────────────────────────────────────────────────

  if (
    !Array.isArray(selectedClothTypes) ||
    selectedClothTypes.length === 0
  ) {
    throw new Error("Select at least one cloth type.");
  }

  const clothes = selectedClothTypes.map(
    (cloth, index) => {
      const clothId = normalizeText(cloth.id);
      const clothLabel = normalizeText(cloth.label);

      const quantity = Number(cloth.quantity);

      if (!clothId) {
        throw new Error(
          `Invalid cloth at position ${index + 1}.`
        );
      }

      if (!clothLabel) {
        throw new Error(
          `Cloth label is missing at position ${index + 1}.`
        );
      }

      if (
        !Number.isInteger(quantity) ||
        quantity < 1
      ) {
        throw new Error(
          `${clothLabel} must have a quantity of at least 1.`
        );
      }


      // Units are only populated for clothes that
      // have color and/or size.
      const units = Array.isArray(cloth.units)
        ? cloth.units
        : [];


      /*
       * If units exist, their count should match quantity.
       *
       * Example:
       *
       * 2 Ikoti
       *
       * units:
       * [
       *   { color: "Black", size: "32" },
       *   { color: "Blue", size: "34" }
       * ]
       */
      if (
        units.length > 0 &&
        units.length !== quantity
      ) {
        throw new Error(
          `${clothLabel} has inconsistent unit details.`
        );
      }


      return {
        id: randomUUID(),
        cloth_id: clothId,
        cloth_label: clothLabel,
        quantity,
        returned_count: 0,
        units: JSON.stringify(units),
        sort_order: index,
      };
    }
  );


  // ─── Dates ──────────────────────────────────────────────────────

  if (
    !(bookingDate instanceof Date) ||
    isNaN(bookingDate.getTime())
  ) {
    throw new Error("Invalid booking date.");
  }

  if (
    !(returnDate instanceof Date) ||
    isNaN(returnDate.getTime())
  ) {
    throw new Error("Invalid return date.");
  }

  /*
   * Compare dates without depending on display format.
   */
  if (returnDate < bookingDate) {
    throw new Error(
      "Return date cannot be before booking date."
    );
  }


  // ─── Payment ────────────────────────────────────────────────────

  const total = parseMoney(
    totalAmount,
    "Total amount"
  );

  const paid = parseMoney(
    amountPaid,
    "Amount paid"
  );

  if (total <= 0) {
    throw new Error(
      "Total amount must be greater than zero."
    );
  }

  if (paid > total) {
    throw new Error(
      "Amount paid cannot be greater than total amount."
    );
  }


  // ─── Images ─────────────────────────────────────────────────────

  const images = Array.isArray(bookingImages)
    ? bookingImages.filter(Boolean)
    : [];


  return {
    client: {
      id: randomUUID(),
      names,
      phone: normalizedPhone,
      type: clientType,
      in_building_address:
        clientType === "Decorator"
          ? normalizedAddress || null
          : null,
    },

    booking: {
      id: randomUUID(),
      status: "active",
      booking_date: formatDateForDB(bookingDate),
      return_date: formatDateForDB(returnDate),
      total_amount: total,
      amount_paid: paid,
    },

    clothes,

    imageUris: images,
  };
}


/**
 * Create and save a complete booking.
 *
 * This function:
 *
 * 1. Validates NewBookingScreen data
 * 2. Formats the data
 * 3. Saves booking images into private storage
 * 4. Creates the client
 * 5. Creates the booking
 * 6. Creates booking clothes
 * 7. Creates booking photos
 * 8. Creates initial payment history if payment exists
 *
 * @param {Object} bookingData
 *
 * @returns {Promise<Object>}
 */
export async function createBooking(bookingData) {
  let savedImageUris = [];

  try {
    // ─── 1. Validate and format ───────────────────────────────────

    const data =
      validateAndFormatBookingData(bookingData);


    // ─── 2. Save images into private storage ──────────────────────

    /*
     * This happens before inserting photo records.
     *
     * saveBookingImages should return:
     *
     * [
     *   "file://...private-image-1.jpg",
     *   "file://...private-image-2.jpg"
     * ]
     */
    if (data.imageUris.length > 0) {
      savedImageUris =
        await saveBookingImages(data.imageUris);
    }


    // ─── 3. Database connection ───────────────────────────────────

    const db = await GetDBConnection();

    const timestamp = now();


    // ─── 4. Start transaction ─────────────────────────────────────

    await db.execAsync("BEGIN TRANSACTION;");


    try {

      // ─── Insert client ──────────────────────────────────────────

      await db.runAsync(
        `
        INSERT INTO clients (
          id,
          names,
          phone,
          type,
          in_building_address,
          created_at,
          updated_at,
          deleted_at,
          synced_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, NULL, NULL);
        `,
        [
          data.client.id,
          data.client.names,
          data.client.phone,
          data.client.type,
          data.client.in_building_address,
          timestamp,
          timestamp,
        ]
      );


      // ─── Insert booking ─────────────────────────────────────────

      await db.runAsync(
        `
        INSERT INTO bookings (
          id,
          client_id,
          status,
          booking_date,
          return_date,
          total_amount,
          amount_paid,
          notes,
          created_at,
          updated_at,
          deleted_at,
          synced_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, NULL, NULL);
        `,
        [
          data.booking.id,
          data.client.id,
          data.booking.status,
          data.booking.booking_date,
          data.booking.return_date,
          data.booking.total_amount,
          data.booking.amount_paid,
          timestamp,
          timestamp,
        ]
      );


      // ─── Insert booking clothes ─────────────────────────────────

      for (const cloth of data.clothes) {

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
            cloth.id,
            data.booking.id,
            cloth.cloth_id,
            cloth.cloth_label,
            cloth.quantity,
            cloth.returned_count,
            cloth.units,
            cloth.sort_order,
            timestamp,
            timestamp,
          ]
        );
      }


      // ─── Insert booking photos ──────────────────────────────────

      for (
        let index = 0;
        index < savedImageUris.length;
        index++
      ) {

        await db.runAsync(
          `
          INSERT INTO booking_photos (
            id,
            booking_id,
            local_uri,
            remote_url,
            sort_order,
            created_at,
            deleted_at,
            synced_at
          )
          VALUES (?, ?, ?, NULL, ?, ?, NULL, NULL);
          `,
          [
            randomUUID(),
            data.booking.id,
            savedImageUris[index],
            index,
            timestamp,
          ]
        );
      }


      // ─── Insert initial payment history ─────────────────────────

      /*
       * payment_history is append-only.
       *
       * Only create an entry when actual money
       * was paid.
       */
      if (data.booking.amount_paid > 0) {

        await db.runAsync(
          `
          INSERT INTO payment_history (
            id,
            booking_id,
            amount,
            note,
            paid_at,
            created_at,
            synced_at
          )
          VALUES (?, ?, ?, ?, ?, ?, NULL);
          `,
          [
            randomUUID(),
            data.booking.id,
            data.booking.amount_paid,
            "Initial payment",
            timestamp,
            timestamp,
          ]
        );
      }


      // ─── Commit ─────────────────────────────────────────────────

      await db.execAsync("COMMIT;");


      return {
        success: true,

        bookingId: data.booking.id,

        clientId: data.client.id,

        imageUris: savedImageUris,
      };

    } catch (dbError) {

      // Undo all database operations.
      await db.execAsync("ROLLBACK;");

      throw dbError;
    }

  } catch (error) {

    console.error(
      "[bookingQueries] Failed to create booking:",
      error
    );

    throw error;
  }
}