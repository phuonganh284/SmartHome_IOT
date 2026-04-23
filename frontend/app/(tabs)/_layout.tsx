import { Tabs } from 'expo-router';
import React from 'react';
import { Image } from 'expo-image';

import { HapticTab } from '@/components/haptic-tab';


const tabIconStyle = (focused: boolean) => ({
  width: 24,
  height: 24,
  tintColor: focused ? '#111111' : '#BDBFC4',
  transform: [{ scale: focused ? 1.12 : 1 }],
  opacity: focused ? 1 : 0.92,
});

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarShowLabel: false,
        tabBarStyle: {
          borderTopColor: '#E5E5E7',
          backgroundColor: '#F6F6F7',
          height: 70,
          paddingTop: 8,
          paddingBottom: 10,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused }) => (
            <Image
              source={require('@/assets/images/home.png')}
              style={tabIconStyle(focused)}
              contentFit="contain"
            />
          ),
        }}
      />
      <Tabs.Screen
        name="automation"
        options={{
          title: 'Automation',
          tabBarIcon: ({ focused }) => (
            <Image
              source={require('@/assets/images/Wifi.png')}
              style={tabIconStyle(focused)}
              contentFit="contain"
            />
          ),
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          title: 'Reports',
          tabBarIcon: ({ focused }) => (
            <Image
              source={require('@/assets/images/bar-chart-2.png')}
              style={tabIconStyle(focused)}
              contentFit="contain"
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused }) => (
            <Image
              source={require('@/assets/images/user.png')}
              style={tabIconStyle(focused)}
              contentFit="contain"
            />
          ),
        }}
      />
    </Tabs>
  );
}
