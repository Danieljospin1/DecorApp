import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const MOCK_BOOKINGS = [
  {
    id: 'b1',
    dress: 'Asteria Gown',
    date: '2025-06-12',
    customer: 'Marie Uwase',
  },
  {
    id: 'b2',
    dress: 'Nebula Dress',
    date: '2025-07-03',
    customer: 'Grace Ndayishimiye',
  },
];

const BookingCard = ({ item, index }) => {
  const translateY = useRef(new Animated.Value(30)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 0,
        delay: index * 100,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        delay: index * 100,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, [translateY, opacity, index]);

  return (
    <Animated.View style={{ transform: [{ translateY }], opacity }}>
      <View style={bStyles.bookingCard}>
        <Ionicons name="calendar" size={24} color="#6200ee" />
        <View style={{ marginLeft: 12 }}>
          <Text style={bStyles.dressName}>{item.dress}</Text>
          <Text style={bStyles.meta}>{`Date: ${item.date}`}</Text>
          <Text style={bStyles.meta}>{`Client: ${item.customer}`}</Text>
        </View>
      </View>
    </Animated.View>
  );
};

export default function BookingsScreen() {
  const renderItem = ({ item, index }) => <BookingCard item={item} index={index} />;

  return (
    <View style={bStyles.container}>
      {MOCK_BOOKINGS.length === 0 ? (
        <View style={bStyles.emptyState}>
          <Ionicons name="archive-outline" size={56} color="#444" />
          <Text style={bStyles.emptyText}>No bookings yet</Text>
        </View>
      ) : (
        <FlatList
          data={MOCK_BOOKINGS}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingVertical: 24 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const bStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0e0e0e',
    paddingHorizontal: 16,
  },
  bookingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1c1c1c',
    padding: 16,
    borderRadius: 20,
    marginBottom: 16,
    shadowColor: '#fff',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
  },
  dressName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  meta: {
    color: '#9e9e9e',
    marginTop: 2,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: '#666',
    marginTop: 12,
  },
});

// ─────────────────────────────────────────────────────────────
// Notes:
// - Hooks (useRef/useEffect) are now only called inside functional components (StockCard & BookingCard), eliminating the "Invalid hook call" warning.
// - Each list item animates independently without violating React's rules of hooks.
// - Remove the previous duplicate default export if your bundler complains; this file now exports default components per screen only.
