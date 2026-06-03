import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === 'index') {
            iconName = focused ? 'today' : 'today-outline';
          } else if (route.name === 'history') {
            iconName = focused ? 'list' : 'list-outline';
          } else if (route.name === 'savings') {
            iconName = focused ? 'leaf' : 'leaf-outline';
          }
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#818CF8', // Violet color for active tab
        tabBarInactiveTintColor: '#6B7A99',
        headerStyle: {
          backgroundColor: '#0D0F14',
        },
        headerTintColor: '#F0F4FF',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
        tabBarStyle: {
          backgroundColor: '#141720',
          borderTopColor: '#252A3A',
        },
        tabBarLabelStyle: {
          fontSize: 11,
        },
      })}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Today',
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="savings"
        options={{
          title: 'Savings',
          headerShown: false,
        }}
      />
    </Tabs>
  );
}