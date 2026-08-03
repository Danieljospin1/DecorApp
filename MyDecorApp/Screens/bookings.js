import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  
} from "react-native";
import { StatusBar } from 'expo-status-bar';
import ImageViewing from "react-native-image-viewing";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from '@react-navigation/native';

const BOOKINGS = [
  {
    id: "1",
    customer: "Diane Uwase",
    weddingDate: "15 Aug 2026",
    stage: "Completed",
    images: [
      "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=800",
      "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800",
      "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800",
    ],
  },
  {
    id: "2",
    customer: "Alice Mukamana",
    weddingDate: "22 Aug 2026",
    stage: "Reserved",
    images: [
      "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=800",
      "https://images.unsplash.com/photo-1521119989659-a83eee488004?w=800",
      "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?w=800",
    ],
  },
  {
    id: "3",
    customer: "Diane Uwase",
    weddingDate: "15 Aug 2026",
    stage: "Completed",
    images: [
      "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=800",
      "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800",
      "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800",
    ],
  },
  {
    id: "4",
    customer: "Alice Mukamana",
    weddingDate: "22 Aug 2026",
    stage: "Reserved",
    images: [
      "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=800",
      "https://images.unsplash.com/photo-1521119989659-a83eee488004?w=800",
      "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?w=800",
    ],
  },
  {
    id: "5",
    customer: "Diane Uwase",
    weddingDate: "15 Aug 2026",
    stage: "Completed",
    images: [
      "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=800",
      "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800",
      "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800",
    ],
  },
  {
    id: "6",
    customer: "Alice Mukamana",
    weddingDate: "22 Aug 2026",
    stage: "Reserved",
    images: [
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

  const openViewer = (images, index) => {
    setViewerImages(images.map((img) => ({ uri: img })));
    setImageIndex(index);
    setViewerVisible(true);
  };

  const renderImages = (images) => (
    <View style={styles.imageStack}>
      {images.slice(0, 3).map((img, index) => (
        <TouchableOpacity
          key={index}
          activeOpacity={0.9}
          onPress={() => openViewer(images, index)}
          style={[
            styles.imageWrapper,
            {
              left: index * 22,
              transform: [
                {
                  rotate:
                    index === 0
                      ? "-10deg"
                      : index === 1
                      ? "0deg"
                      : "10deg",
                },
              ],
              zIndex: index,
            },
          ]}
        >
          <Image source={{ uri: img }} style={styles.image} />
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderItem = ({ item }) => (
    <TouchableOpacity
      activeOpacity={0.2}
      style={styles.card}
      onPress={() => console.log("Navigate to Booking Details")}
    >
      {renderImages(item.images)}

      <View style={styles.info}>
        <View style={styles.topRow}>
          <Text style={styles.name}>{item.customer}</Text>

          {item.stage === "Completed" ? (
            <Ionicons
              name="checkmark-circle"
              color="#16A34A"
              size={22}
            />
          ) : (
            <Ionicons
              name="time"
              color="#F59E0B"
              size={22}
            />
          )}
        </View>

        <Text style={styles.date}>
          Wedding • {item.weddingDate}
        </Text>

        <Text style={styles.stage}>
          {item.stage}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>

      <FlatList
        data={BOOKINGS}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 20, paddingBottom: 10 }}
      />

      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.85}
      onPress={()=>{navigation.navigate('New Booking');}}>
        <Ionicons
          name="add"
          size={32}
          color="white"
        />
      </TouchableOpacity>

      <ImageViewing
        images={viewerImages}
        imageIndex={imageIndex}
        visible={viewerVisible}
        onRequestClose={() => setViewerVisible(false)}
      />

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },

  title: {
    fontSize: 30,
    fontWeight: "700",
    color: "#111827",
    paddingHorizontal: 20,
    
  },

  card: {
    backgroundColor: "#FFF",
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
    elevation: 3,
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
  },

  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  name: {
    fontWeight: "700",
    fontSize: 18,
    color: "#111827",
  },

  date: {
    marginTop: 6,
    color: "#6B7280",
    fontSize: 14,
  },

  stage: {
    marginTop: 8,
    fontWeight: "600",
    color: "#0F766E",
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
  },
});