import { Tabs } from 'expo-router';
import React from 'react';
import { Text } from 'react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#4CAF50',
        tabBarInactiveTintColor: '#78909C',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#E0E0E0',
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => (
            <TabIcon icon="🏠" active={color === '#4CAF50'} />
          ),
        }}
      />
      <Tabs.Screen
        name="diagnose"
        options={{
          title: 'Diagnose',
          tabBarIcon: ({ color }) => (
            <TabIcon icon="🔬" active={color === '#4CAF50'} />
          ),
        }}
      />
      <Tabs.Screen
        name="monitor"
        options={{
          title: 'Monitor',
          tabBarIcon: ({ color }) => (
            <TabIcon icon="📡" active={color === '#4CAF50'} />
          ),
        }}
      />
      <Tabs.Screen
        name="care-plan"
        options={{
          title: 'Care Plan',
          tabBarIcon: ({ color }) => (
            <TabIcon icon="💬" active={color === '#4CAF50'} />
          ),
        }}
      />
      <Tabs.Screen
        name="harvest"
        options={{
          title: 'Harvest',
          tabBarIcon: ({ color }) => (
            <TabIcon icon="📊" active={color === '#4CAF50'} />
          ),
        }}
      />
    </Tabs>
  );
}

// TabIcon component using Text
function TabIcon({ icon, active }: { icon: string; active: boolean }) {
  return (
    <Text style={{ fontSize: 24, opacity: active ? 1 : 0.6 }}>
      {icon}
    </Text>
  );
}
