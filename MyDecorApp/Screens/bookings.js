// screens/BookingsScreen.jsx

import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
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


/*
 * UI-only status decisions.
 *
 * The query decides WHAT the status is.
 * The screen decides HOW that status looks.
 */
const STATUS_STYLE = {
  active: {
    color: C.primary,
    icon: "time-outline",
  },

  overdue: {
    color: C.danger,
    icon: "alert-circle",
  },

  returned: {
    color: C.success,
    icon: "checkmark-circle",
  },
};


export default function BookingsScreen() {
  const navigation = useNavigation();

  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerImages, setViewerImages] = useState([]);
  const [imageIndex, setImageIndex] = useState(0);

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);


  /*
   * Reload bookings every time the screen receives focus.
   *
   * This means:
   *
   * New Booking
   *      ↓
   * Save
   *      ↓
   * Go back
   *      ↓
   * BookingsScreen automatically reloads
   */
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      const loadBookings = async () => {
        try {
          setLoading(true);
          setError(null);

          const data = await getBookingsList();

          if (!cancelled) {
            setBookings(data);

            console.log(
              "[BookingsScreen] Bookings loaded:",
              data
            );
          }

        } catch (err) {
          console.error(
            "[BookingsScreen] Failed to load bookings:",
            err
          );

          if (!cancelled) {
            setError(
              err.message ||
              "Failed to load bookings."
            );
          }

        } finally {
          if (!cancelled) {
            setLoading(false);
          }
        }
      };


      loadBookings();


      return () => {
        cancelled = true;
      };
    }, [])
  );


  const openViewer = (photos, index) => {
    if (!photos || photos.length === 0) {
      return;
    }

    setViewerImages(
      photos.map((uri) => ({
        uri,
      }))
    );

    setImageIndex(index);
    setViewerVisible(true);
  };


  /*
   * Supports:
   *
   * 0 images → calendar avatar
   * 1 image  → single centered image
   * 2 images → overlapping images
   * 3 images → stacked images
   */
  const renderPhotoStack = (photos = []) => {
    const visiblePhotos = photos.slice(0, 3);


    // ─── No photos ────────────────────────────────────────────────

    if (visiblePhotos.length === 0) {
      return (
        <View style={styles.imageStack}>
          <View style={styles.emptyPhotoAvatar}>
            <Ionicons
              name="calendar-outline"
              size={30}
              color={C.primary}
            />
          </View>
        </View>
      );
    }


    // ─── Image positioning ────────────────────────────────────────

    const imageStyles = {
      1: [
        {
          left: 22,
          rotate: "0deg",
        },
      ],

      2: [
        {
          left: 0,
          rotate: "-7deg",
        },
        {
          left: 22,
          rotate: "7deg",
        },
      ],

      3: [
        {
          left: 0,
          rotate: "-10deg",
        },
        {
          left: 22,
          rotate: "0deg",
        },
        {
          left: 44,
          rotate: "10deg",
        },
      ],
    };


    return (
      <View style={styles.imageStack}>
        {visiblePhotos.map((uri, index) => {
          const position =
            imageStyles[visiblePhotos.length][index];

          return (
            <TouchableOpacity
              key={uri}
              activeOpacity={0.9}
              onPress={() =>
                openViewer(photos, index)
              }
              style={[
                styles.imageWrapper,
                {
                  left: position.left,

                  transform: [
                    {
                      rotate: position.rotate,
                    },
                  ],

                  zIndex: index + 1,
                },
              ]}
            >
              <Image
                source={{ uri }}
                style={styles.image}
              />
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };


  const renderItem = ({ item }) => {
    const statusStyle =
      STATUS_STYLE[item.status];

    const paymentColor =
      item.isFullyPaid
        ? C.success
        : C.remaining;

    const paymentIcon =
      item.isFullyPaid
        ? "checkmark-done-outline"
        : "cash-outline";


    return (
      <TouchableOpacity
        activeOpacity={0.8}
        style={styles.card}
        onPress={() =>
          navigation.navigate(
            "Booking Details",
            {
              bookingId: item.id,
            }
          )
        }
      >

        {/* Booking photos */}
        {renderPhotoStack(item.photos)}


        <View style={styles.info}>

          {/* Client name + booking status */}
          <View style={styles.topRow}>

            <Text
              style={styles.name}
              numberOfLines={1}
            >
              {item.clientName}
            </Text>


            <View style={styles.iconTextGroup}>
              <Ionicons
                name={statusStyle.icon}
                size={15}
                color={statusStyle.color}
              />

              <Text
                style={[
                  styles.rowText,
                  {
                    color: statusStyle.color,
                  },
                ]}
              >
                {item.statusLabel}
              </Text>
            </View>

          </View>


          {/* Payment */}
          <View style={styles.iconTextGroup}>

            <Ionicons
              name={paymentIcon}
              size={14}
              color={paymentColor}
            />

            <Text
              style={[
                styles.rowText,
                {
                  color: paymentColor,
                },
              ]}
            >
              {item.paymentText}
            </Text>

          </View>


          {/* Booked clothes */}
          <View style={styles.iconTextGroup}>

            <Ionicons
              name="shirt-outline"
              size={14}
              color={C.textMuted}
            />

            <Text
              style={[
                styles.rowText,
                {
                  color: C.textMuted,
                },
              ]}
              numberOfLines={1}
            >
              {item.itemsSummary}
            </Text>

          </View>

        </View>
      </TouchableOpacity>
    );
  };


  /*
   * Empty state.
   *
   * FlatList's ListEmptyComponent handles this inside the
   * same layout as the bookings list.
   */
  const renderEmptyState = () => {
    if (loading) {
      return null;
    }

    if (error) {
      return (
        <View style={styles.emptyState}>

          <Ionicons
            name="alert-circle-outline"
            size={50}
            color={C.danger}
          />

          <Text style={styles.emptyTitle}>
            Could not load bookings
          </Text>

          <Text style={styles.emptyText}>
            {error}
          </Text>

        </View>
      );
    }

    return (
      <View style={styles.emptyState}>

        <View style={styles.emptyIconContainer}>
          <Ionicons
            name="calendar-outline"
            size={50}
            color={C.primary}
          />
        </View>

        <Text style={styles.emptyTitle}>
          No bookings yet
        </Text>

        <Text style={styles.emptyText}>
          Your saved bookings will appear here.
        </Text>

      </View>
    );
  };


  return (
    <SafeAreaView style={styles.container}>

      <Text style={styles.title}>
        Bookings
      </Text>


      <ImageViewing
        images={viewerImages}
        imageIndex={imageIndex}
        visible={viewerVisible}
        onRequestClose={() =>
          setViewerVisible(false)
        }
      />


      {/*
       * Initial loading state.
       */}
      {loading ? (

        <View style={styles.loadingContainer}>

          <ActivityIndicator
            size="large"
            color={C.primary}
          />

        </View>

      ) : (

        <FlatList
          data={bookings}

          keyExtractor={(item) => item.id}

          renderItem={renderItem}

          ListEmptyComponent={renderEmptyState}

          contentContainerStyle={[
            styles.listContent,

            bookings.length === 0 &&
              styles.emptyListContent,
          ]}
        />

      )}


      {/* Add booking */}
      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.85}
        onPress={() =>
          navigation.navigate("New Booking")
        }
      >
        <Ionicons
          name="add"
          size={32}
          color="white"
        />
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


  // ─── List ───────────────────────────────────────────────────────

  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },


  emptyListContent: {
    flexGrow: 1,
    justifyContent: "center",
  },


  // ─── Booking card ───────────────────────────────────────────────

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

    shadowOffset: {
      width: 0,
      height: 5,
    },

    elevation: 0.5,
  },


  // ─── Photos ─────────────────────────────────────────────────────

  imageStack: {
    width: 110,
    height: 90,
    position: "relative",
  },


  emptyPhotoAvatar: {
    width: 110,
    height: 90,
    borderRadius: 20,

    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",

    backgroundColor: C.success + "22",

    
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


  // ─── Booking information ────────────────────────────────────────

  info: {
    flex: 1,
    marginLeft: 18,
    rowGap: 8,
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
  },


  rowText: {
    marginLeft: 5,
    fontSize: 13,
    fontWeight: "600",
  },


  // ─── Loading ────────────────────────────────────────────────────

  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },


  // ─── Empty / Error states ───────────────────────────────────────

  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
  },


  emptyIconContainer: {
    width: 100,
    height: 100,

    borderRadius: 50,

    justifyContent: "center",
    alignItems: "center",

    backgroundColor: C.primary + "12",

    marginBottom: 18,
  },


  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: C.text,
    marginBottom: 8,
  },


  emptyText: {
    fontSize: 14,
    color: C.textSecondary,
    textAlign: "center",
    lineHeight: 21,
  },


  // ─── Floating action button ─────────────────────────────────────

  fab: {
    position: "absolute",

    right: 28,
    bottom: 70,

    width: 62,
    height: 62,

    borderRadius: 20,

    backgroundColor: C.primary,

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
  },

});