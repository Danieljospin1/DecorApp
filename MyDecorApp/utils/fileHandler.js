import * as FileSystem from "expo-file-system/legacy";
import { randomUUID } from "expo-crypto";

const BOOKING_IMAGES_DIR =
  `${FileSystem.documentDirectory}booking-images/`;


/**
 * Ensures that the private booking images directory exists.
 */
async function ensureBookingImagesDirectory() {
  const dirInfo = await FileSystem.getInfoAsync(BOOKING_IMAGES_DIR);

  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(
      BOOKING_IMAGES_DIR,
      {
        intermediates: true,
      }
    );
  }
}


/**
 * Saves an array of selected images into the application's
 * private booking images directory.
 *
 * @param {Array} images
 * Array of image objects or image URIs.
 *
 * @returns {Promise<string[]>}
 * Array containing the new private image URIs.
 */
export async function saveBookingImages(images) {
  try {
    await ensureBookingImagesDirectory();

    const savedUris = [];

    for (const image of images) {
      // Supports both:
      // image = "file://..."
      // OR
      // image = { uri: "file://..." }

      const sourceUri =
        typeof image === "string"
          ? image
          : image.uri;

      if (!sourceUri) {
        console.warn("Skipping image with no URI:", image);
        continue;
      }

      const fileExtension =
        getFileExtension(sourceUri) || "jpg";

      const fileName =
        `${randomUUID()}.${fileExtension}`;

      const destinationUri =
        `${BOOKING_IMAGES_DIR}${fileName}`;

      await FileSystem.copyAsync({
        from: sourceUri,
        to: destinationUri,
      });

      savedUris.push(destinationUri);
    }

    return savedUris;

  } catch (error) {
    console.error(
      "[fileHandler] Failed to save booking images:",
      error
    );

    throw error;
  }
}


/**
 * Extracts the file extension from a URI.
 */
function getFileExtension(uri) {
  const cleanUri = uri.split("?")[0];

  const match =
    cleanUri.match(/\.([a-zA-Z0-9]+)$/);

  return match ? match[1] : null;
}


/**
 * Deletes a specific image from private storage.
 */
export async function deleteBookingImage(uri) {
  try {
    const fileInfo =
      await FileSystem.getInfoAsync(uri);

    if (fileInfo.exists) {
      await FileSystem.deleteAsync(uri);
    }

  } catch (error) {
    console.error(
      "[fileHandler] Failed to delete image:",
      error
    );

    throw error;
  }
}


/**
 * Deletes all stored booking images.
 * Use carefully.
 */
export async function deleteAllBookingImages() {
  try {
    const dirInfo =
      await FileSystem.getInfoAsync(
        BOOKING_IMAGES_DIR
      );

    if (dirInfo.exists) {
      await FileSystem.deleteAsync(
        BOOKING_IMAGES_DIR,
        {
          idempotent: true,
        }
      );
    }

  } catch (error) {
    console.error(
      "[fileHandler] Failed to delete booking images:",
      error
    );

    throw error;
  }
}