import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

// Screens
import StockScreen from '../Screens/stock'
import BookingsScreen from '../Screens/bookings';

const Tab = createBottomTabNavigator();

export default function BottomTabs() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: true,
          tabBarIcon: ({ focused, color, size }) => {
            let iconName;

            if (route.name === 'Bookings') {
              iconName = focused ? 'calendar' : 'calendar-outline';
            } else if (route.name === 'Stock') {
              iconName = focused ? 'cube' : 'cube-outline';
            }

            return <Ionicons name={iconName} size={size} color={color} />;
          },
          tabBarActiveTintColor: '#c69c6d',
          tabBarInactiveTintColor: 'gray',
          tabBarStyle: {
            backgroundColor: '#fff',
            paddingBottom: 5,
            height: 60,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            position: 'absolute',
            elevation: 5,
          },
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '600',
          },
        })}
      >
        <Tab.Screen name="Stock" component={StockScreen} />
        <Tab.Screen name="Bookings" component={BookingsScreen} />
        
      </Tab.Navigator>
    </NavigationContainer>
  );
}
