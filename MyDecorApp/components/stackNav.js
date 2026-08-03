import { createNativeStackNavigator } from '@react-navigation/native-stack';

import BookingsScreen from '../Screens/bookings';
import NewBookingScreen from '../Screens/newBooking';

const Stack = createNativeStackNavigator();

export default function BookingsStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
        
      }}
    >
      <Stack.Screen
        name="Bookings"
        component={BookingsScreen}
        
      />

      <Stack.Screen
        name="New Booking"
        component={NewBookingScreen}
      />
    </Stack.Navigator>
  );
}