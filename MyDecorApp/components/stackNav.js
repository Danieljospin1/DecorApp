import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AppInitiator from '../splashScreen';
import BookingsScreen from '../Screens/bookings';
import NewBookingScreen from '../Screens/newBooking';
import BookingDetailsScreen from '../Screens/bookingDetails';

const Stack = createNativeStackNavigator();

export default function BookingsStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,

      }}
    >
      <Stack.Screen name="AppInitiator" component={AppInitiator} options={{ headerShown: false }} />
      <Stack.Screen
        name="Bookings"
        component={BookingsScreen}
        options={{ headerShown: false }}

      />
      <Stack.Screen
        name="Booking Details"
        component={BookingDetailsScreen}
      />

      <Stack.Screen
        name="New Booking"
        component={NewBookingScreen}
      />
    </Stack.Navigator>
  );
}