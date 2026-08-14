// hooks/useCheckIn.js
import { useState, useCallback } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { getCheckInItems } from "../database/queries/checkInQuery";
import { markCheckedIn } from "../database/queries/markCheckIn";
import { updateBookingReturns } from "../database/queries/updateBookingReturns";
import { updateBookingPayment } from "../database/queries/updateBookingPayment";

// Owns: loading check-in items on focus, stamping the cooldown the moment
// they're shown, and applying mutations. Deliberately does NOT catch
// errors from resolveReturn/resolvePayment — those propagate to whichever
// component called them, so that component can show its own inline error
// (same pattern BookingDetailsScreen already uses), rather than this hook
// guessing how each caller wants failures displayed.
export function useCheckIn() {
  const [items, setItems] = useState([]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      (async () => {
        try {
          const data = await getCheckInItems();
          if (cancelled) return;
          setItems(data);

          if (data.length > 0) {
            await markCheckedIn(data.map((b) => b.id));
          }
        } catch (err) {
          console.error("[useCheckIn] failed to load check-in items:", err);
        }
      })();

      return () => {
        cancelled = true;
      };
    }, [])
  );

  // Dismissing the whole sheet doesn't need its own DB call — every item
  // currently in `items` was already stamped the moment it was loaded
  // above, cancel or not.
  const dismiss = useCallback(() => setItems([]), []);

  // Drops the RETURN flag for one booking, and removes it from the list
  // entirely once BOTH flags are resolved — a booking that still owes
  // money stays visible with only its payment section left, not removed
  // just because returns are settled.
  const resolveReturn = useCallback(async (bookingId, clothesState) => {
    await updateBookingReturns(bookingId, clothesState);
    setItems((prev) =>
      prev
        .map((b) => (b.id === bookingId ? { ...b, returnQualifies: false } : b))
        .filter((b) => b.returnQualifies || b.paymentQualifies)
    );
  }, []);

  const resolvePayment = useCallback(async (bookingId, payment) => {
    await updateBookingPayment(bookingId, payment);
    setItems((prev) =>
      prev
        .map((b) => (b.id === bookingId ? { ...b, paymentQualifies: false } : b))
        .filter((b) => b.returnQualifies || b.paymentQualifies)
    );
  }, []);

  return { items, dismiss, resolveReturn, resolvePayment };
}