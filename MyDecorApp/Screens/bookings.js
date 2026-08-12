// screens/BookingsScreen.jsx
import React, { useState,useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect,useNavigation } from "@react-navigation/native";
import ImageViewing from "react-native-image-viewing";
import { getBookingsList } from "../database/queries/bookingsQuery";

const C = {
  primary: "#0F766E",
  bg: "#F8FAFC",
  card: "#FFFFFF",
  text: "#0F172A",
  textSecondary: "#64748B",
  textMuted: "#94A3B8",
  danger: "#EF4444",
  remaining: "#7C3AED",
  success: "#059669",
};

// Mirrors the logic already used in BookingDetailsScreen. Kept identical on
// purpose — this should eventually move to a shared /utils/bookingStatus.js
// so the two screens can never silently drift out of sync with each other.
function getBookingStatus(booking) {
  if (booking.status === "returned") return "returned";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const ret = new Date(booking.return_date);
  ret.setHours(0, 0, 0, 0);
  if (ret < today) return "overdue";
  return "active";
}

// One place that decides icon + color + label for a status, so the icon
// beside the name and the text can never disagree with each other.
const STATUS_STYLE = {
  active: { color: C.primary, icon: "time-outline", label: "Not yet returned" },
  overdue: { color: C.danger, icon: "alert-circle", label: "Overdue" },
  returned: { color: C.success, icon: "checkmark-circle", label: "Returned" },
};

function paymentInfo(booking) {
  const remaining = booking.total_amount - booking.amount_paid;
  if (remaining <= 0) {
    return { text: "Fully paid", color: C.success, icon: "checkmark-done-outline" };
  }
  return {
    text: `${remaining.toLocaleString()} RWF due`,
    color: C.remaining,
    icon: "cash-outline",
  };
}

function itemsSummary(clothes) {
  if (!clothes || clothes.length === 0) return "No items";
  const labels = clothes.map((c) => c.cloth_label);
  if (labels.length <= 2) return labels.join(", ");
  return `${labels.slice(0, 2).join(", ")} +${labels.length - 2} more`;
}

// TEMPORARY — shaped to match the real bookings/clients/booking_clothes/
// booking_photos schema (not the old wedding-date/stage mock) so this drops
// in cleanly once getBookings() from the data layer exists. Replace this
// array with that call; nothing else here should need to change.
const BOOKINGS = [
  {
    id: "1",
    client: { name: "Diane Uwase" },
    status: "active",
    booking_date: "2026-08-05",
    return_date: "2026-08-09",
    total_amount: 45000,
    amount_paid: 45000,
    clothes: [{ cloth_label: "Gown" }, { cloth_label: "Ikoti" }],
    photos: [
      "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=800",
      "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800",
      "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800",
    ],
  },
  {
    id: "2",
    client: { name: "Alice Mukamana" },
    status: "active",
    booking_date: "2026-08-01",
    return_date: "2026-08-10",
    total_amount: 60000,
    amount_paid: 20000,
    clothes: [{ cloth_label: "Ishati" }],
    photos: [
      "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=800",
      "https://images.unsplash.com/photo-1521119989659-a83eee488004?w=800",
      "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?w=800",
    ],
  },
  {
    id: "3",
    client: { name: "Grace Ingabire" },
    status: "active",
    booking_date: "2026-07-28",
    return_date: "2026-08-06", // in the past relative to today (12 Aug 2026) -> overdue
    total_amount: 30000,
    amount_paid: 30000,
    clothes: [{ cloth_label: "Umukenyero" }, { cloth_label: "Top" }, { cloth_label: "Ikoti" }],
    photos: [
      "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=800",
      "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800",
      "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800",
    ],
  },
  {
    id: "4",
    client: { name: "Claudine Umutoni" },
    status: "returned",
    booking_date: "2026-07-20",
    return_date: "2026-07-25",
    total_amount: 25000,
    amount_paid: 25000,
    clothes: [{ cloth_label: "Malene" }],
    photos: [
      "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=800",
      "https://images.unsplash.com/photo-1521119989659-a83eee488004?w=800",
      "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?w=800",
    ],
  },
  {
    id: "5",
    client: { name: "Claudine Umutoni" },
    status: "returned",
    booking_date: "2026-07-20",
    return_date: "2026-07-25",
    total_amount: 25000,
    amount_paid: 25000,
    clothes: [{ cloth_label: "Malene" }],
    photos: [
      "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=800",
      "https://images.unsplash.com/photo-1521119989659-a83eee488004?w=800",
      "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?w=800",
    ],
  },
  {
    id: "6",
    client: { name: "Claudine Umutoni" },
    status: "returned",
    booking_date: "2026-07-20",
    return_date: "2026-07-25",
    total_amount: 25000,
    amount_paid: 25000,
    clothes: [{ cloth_label: "Malene" }],
    photos: [
      "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=800",
      "https://images.unsplash.com/photo-1521119989659-a83eee488004?w=800",
      "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?w=800",
    ],
  },
  {
    id: "7",
    client: { name: "Claudine Umutoni" },
    status: "returned",
    booking_date: "2026-07-20",
    return_date: "2026-07-25",
    total_amount: 25000,
    amount_paid: 25000,
    clothes: [{ cloth_label: "Malene" }],
    photos: [
      "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=800",
      "https://images.unsplash.com/photo-1521119989659-a83eee488004?w=800",
      "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?w=800",
    ],
  },
];

export default function BookingsScreen() {
  const navigation = useNavigation();
  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerImages, setViewerImages] = useState([]);
  const [imageIndex, setImageIndex] = useState(0);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);


   // Refetch every time this screen comes into focus — not just on first
  // mount — so returning here after creating/editing a booking, or after
  // marking clothes returned, always shows current data.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
 
      setLoading(true);
      setError(null);
 
      getBookingsList()
        .then((data) => {
          if (!cancelled) setBookings(data);
        })
        .catch((err) => {
          console.error("[BookingsScreen] failed to load bookings:", err);
          if (!cancelled) setError(err.message);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
 
      return () => {
        cancelled = true;
      };
    }, [])
  );

  const openViewer = (photos, index) => {
    setViewerImages(photos.map((uri) => ({ uri })));
    setImageIndex(index);
    setViewerVisible(true);
  };

  const renderPhotoStack = (photos) => (
    <View style={styles.imageStack}>
      {photos.slice(0, 3).map((uri, index) => (
        <TouchableOpacity
          key={index}
          activeOpacity={0.9}
          onPress={() => openViewer(photos, index)}
          style={[
            styles.imageWrapper,
            {
              left: index * 22,
              transform: [{ rotate: ["-10deg", "0deg", "10deg"][index] }],
              zIndex: index,
            },
          ]}
        >
          <Image source={{ uri }} style={styles.image} />
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderItem = ({ item }) => {
    const status = getBookingStatus(item);
    const statusStyle = STATUS_STYLE[status];
    const payment = paymentInfo(item);

    return (
      <TouchableOpacity
        activeOpacity={0.8}
        style={styles.card}
        onPress={() => navigation.navigate("Booking Details", { bookingId: item.id })}
      >
        {renderPhotoStack(item.photos)}

        <View style={styles.info}>
          {/* Name + status, inline, on the same row */}
          <View style={styles.topRow}>
            <Text style={styles.name} numberOfLines={1}>{item.client.name}</Text>
            <View style={styles.iconTextGroup}>
              <Ionicons name={statusStyle.icon} size={15} color={statusStyle.color} />
              <Text style={[styles.rowText, { color: statusStyle.color }]}>
                {statusStyle.label}
              </Text>
            </View>
          </View>

          {/* Due money */}
          <View style={styles.iconTextGroup}>
            <Ionicons name={payment.icon} size={14} color={payment.color} />
            <Text style={[styles.rowText, { color: payment.color }]}>
              {payment.text}
            </Text>
          </View>

          {/* Booked cloth types */}
          <View style={styles.iconTextGroup}>
            <Ionicons name="shirt-outline" size={14} color={C.textMuted} />
            <Text style={[styles.rowText, { color: C.textMuted }]} numberOfLines={1}>
              {itemsSummary(item.clothes)}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Bookings</Text>

      <ImageViewing
        images={viewerImages}
        imageIndex={imageIndex}
        visible={viewerVisible}
        onRequestClose={() => setViewerVisible(false)}
      />

      <FlatList
        data={BOOKINGS}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 20, paddingBottom: 10 }}
      />

      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.85}
        onPress={() => navigation.navigate("New Booking")}
      >
        <Ionicons name="add" size={32} color="white" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
  title: {
    fontSize: 25,
    fontWeight: "700",
    color: C.primary,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  card: {
    backgroundColor: C.card,
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 0.5,
  },

  imageStack: {
    width: 110,
    height: 90,
    position: "relative",
  },
  imageWrapper: {
    position: "absolute",
    top: 8,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "#FFF",
  },
  image: {
    width: 60,
    height: 75,
  },

  info: {
    flex: 1,
    marginLeft: 18,
    rowGap: 8
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  name: {
    flexShrink: 1,
    fontWeight: "700",
    fontSize: 17,
    color: C.text,
    marginRight: 8,
  },
  iconTextGroup: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 0,
  },
  rowText: {
    marginLeft: 5,
    fontSize: 13,
    fontWeight: "600",
  },
  fab: {
    position: "absolute",
    right: 28,
    bottom: 70,

    width: 62,
    height: 62,
    borderRadius: 20,

    backgroundColor: "#0F766E",

    justifyContent: "center",
    alignItems: "center",

    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 5,
    },
    elevation: 6,
  }
});