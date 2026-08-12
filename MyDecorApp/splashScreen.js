import React, { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { GetDBConnection } from "./database/db";
import { RunDBMigrations } from './database/migrationsRunner';



// Don't auto-hide splash screen
SplashScreen.preventAutoHideAsync();


export default function AppInitiator({ navigation }) {
    const [appIsReady, setAppIsReady] = useState(false);

    useEffect(() => {
        async function PrepareApp() {
            try {
                // 1. Initialize DB and schemas 
                await GetDBConnection();
                await RunDBMigrations();

            } catch (err) {
                console.warn("Startup Error:", err);
                setIsLoggedIn(false);
            } finally {
                setAppIsReady(true);
                // Hide the splash screen manually when ready
                await SplashScreen.hideAsync();
                navigation.replace("Bookings");
            }
        }

        PrepareApp();
    }, []);

    if (!appIsReady) {
        // Don't render anything until app is ready
        return null;
    }


}


