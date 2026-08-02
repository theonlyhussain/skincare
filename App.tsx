import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import RootNavigator from './src/navigation';
import { initDatabase } from './src/db/database';
import { colors, typography } from './src/theme';

export default function App() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    initDatabase()
      .then(() => setReady(true))
      .catch((e) => {
        console.error('Database init failed', e);
        setReady(true); // render anyway; screens surface their own errors
      });
  }, []);

  if (!ready) {
    return (
      <View style={styles.splash}>
        <Text style={styles.logo}>SkinCare</Text>
        <ActivityIndicator color={colors.primary} style={{ marginTop: 12 }} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <RootNavigator />
      <StatusBar style="dark" />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: { ...typography.title, color: colors.primary },
});
