import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import BottomTabs from './components/bottomTabs'
import BookingsScreen from './Screens/bookings';
import StockScreen from './Screens/stock';
import {MotiProvider} from 'moti'

export default function App() {
  return (
    <View style={styles.container}>
      <BottomTabs/>
      <StatusBar style="auto" backgroundColor='black'/>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    
  },
});
