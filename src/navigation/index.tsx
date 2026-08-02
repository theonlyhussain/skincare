import React from 'react';
import { Text, View, StyleSheet } from 'react-native';
import {
  NavigationContainer,
  DefaultTheme,
  type NavigatorScreenParams,
  type CompositeScreenProps,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator, type BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, typography } from '../theme';

import HomeScreen from '../screens/HomeScreen';
import ShelfScreen from '../screens/ShelfScreen';
import HabitsScreen from '../screens/HabitsScreen';
import ChatScreen from '../screens/ChatScreen';
import SettingsScreen from '../screens/SettingsScreen';
import SkinLogScreen from '../screens/SkinLogScreen';
import LogDetailScreen from '../screens/LogDetailScreen';
import AddProductScreen from '../screens/AddProductScreen';
import ProductDetailScreen from '../screens/ProductDetailScreen';

export type RootStackParamList = {
  Tabs: NavigatorScreenParams<TabParamList> | undefined;
  SkinLog: undefined;
  LogDetail: { logId: number };
  AddProduct: undefined;
  ProductDetail: { productId: number };
};

export type TabParamList = {
  HomeTab: undefined;
  ShelfTab: undefined;
  HabitsTab: undefined;
  ChatTab: undefined;
  SettingsTab: undefined;
};

/** Navigation prop type for screens inside the tab navigator that also push root-stack screens. */
export type TabScreenProps<T extends keyof TabParamList> = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, T>,
  NativeStackScreenProps<RootStackParamList>
>;

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

const TAB_ICONS: Record<keyof TabParamList, [string, string]> = {
  HomeTab: ['home', 'home-outline'],
  ShelfTab: ['cube', 'cube-outline'],
  HabitsTab: ['water', 'water-outline'],
  ChatTab: ['chatbubbles', 'chatbubbles-outline'],
  SettingsTab: ['settings', 'settings-outline'],
};

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primaryDark,
        tabBarInactiveTintColor: colors.textFaint,
        tabBarLabelStyle: styles.tabLabel,
        tabBarStyle: styles.tabBar,
        tabBarIcon: ({ focused, color }) => {
          const [active, inactive] = TAB_ICONS[route.name as keyof TabParamList];
          return (
            <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
              <Ionicons name={focused ? (active as any) : (inactive as any)} size={21} color={color} />
            </View>
          );
        },
      })}
    >
      <Tab.Screen name="HomeTab" component={HomeScreen} options={{ title: 'Home' }} />
      <Tab.Screen name="ShelfTab" component={ShelfScreen} options={{ title: 'Shelf' }} />
      <Tab.Screen name="HabitsTab" component={HabitsScreen} options={{ title: 'Habits' }} />
      <Tab.Screen name="ChatTab" component={ChatScreen} options={{ title: 'Chat' }} />
      <Tab.Screen name="SettingsTab" component={SettingsScreen} options={{ title: 'Settings' }} />
    </Tab.Navigator>
  );
}

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.background,
    card: colors.surface,
    text: colors.text,
    border: colors.border,
    primary: colors.primary,
  },
};

export default function RootNavigator() {
  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
          headerTitleStyle: typography.h2,
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="Tabs" component={MainTabs} options={{ headerShown: false }} />
        <Stack.Screen
          name="SkinLog"
          component={SkinLogScreen}
          options={{ presentation: 'modal', headerShown: false }}
        />
        <Stack.Screen
          name="LogDetail"
          component={LogDetailScreen}
          options={{ title: 'Skin check', headerBackTitle: 'Back' }}
        />
        <Stack.Screen
          name="AddProduct"
          component={AddProductScreen}
          options={{ title: 'Add product', presentation: 'modal' }}
        />
        <Stack.Screen
          name="ProductDetail"
          component={ProductDetailScreen}
          options={{ title: 'Product', headerBackTitle: 'Back' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
    height: 68,
    paddingTop: 6,
    paddingBottom: 8,
  },
  tabLabel: { fontSize: 11, fontWeight: '600' },
  iconWrap: {
    width: 36,
    height: 28,
    borderRadius: radii.round,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapActive: { backgroundColor: colors.primarySoft },
});
