import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import NewBookingScreen from './Screens/newBooking';
import BookingsScreen from './Screens/bookings';
import BookingsStack from './components/stackNav';
import { NavigationContainer } from "@react-navigation/native";

import {MotiProvider} from 'moti'

export default function App() {
  return (
    <NavigationContainer style={styles.container}>
      <StatusBar style="auto" backgroundColor='transparent'/>
      <BookingsStack/>
      
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    
  },
});
