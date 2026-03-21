import { StyleSheet } from 'react-native'
import React from 'react'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Octicons, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import HomeScreen from '../screens/HomeScreen'
import ProfileScreen from '../screens/ProfileScreen'
import RoomScreen from '../screens/RoomScreen'
import CreateScheduleScreen from '../screens/CreateScheduleScreen'
import StoreScreen from '../screens/StoreScreen'
import CalendarScreen from '../screens/CalendarScreen';

const Stack = createNativeStackNavigator()
const Tab = createBottomTabNavigator()

function Tabs() {
  return (
    <Tab.Navigator 
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: false,
        tabBarIcon: ({ focused, color }) => {
          switch (route.name) {
            case 'Home':
              return (
                <Octicons 
                  name={focused ? 'home' : 'home-fill'}
                  size={24} 
                  color={color}
                />
              )
            case 'Social':
              return (
                <MaterialCommunityIcons 
                  name={focused ? 'account-group-outline' : 'account-group'} 
                  size={24} 
                  color={color}
                />
              )
            case 'Create':
              return (
                <MaterialIcons 
                  name={focused ? 'add-circle-outline' : 'add-circle'}
                  size={24} 
                  color={color}
                />
              )
            case 'Store':
              return (
                <MaterialCommunityIcons 
                  name={focused ? 'storefront-outline' : 'storefront'}
                  size={24} 
                  color={color}
                />
              )
            case 'Profile':
              return (
                <MaterialCommunityIcons 
                  name={focused ? 'checkbox-blank-circle-outline' : 'checkbox-blank-circle'}
                  size={24} 
                  color={color}
                />
              )
          }
        }
      })}>
        <Tab.Screen name='Home' component={HomeScreen}/>
        <Tab.Screen name='Social' component={RoomScreen}/>
        <Tab.Screen name='Create' component={CreateScheduleScreen}/>
        <Tab.Screen name='Store' component={StoreScreen}/>
        <Tab.Screen name='Profile' component={ProfileScreen}/>
    </Tab.Navigator>
  )
}

export default function AppNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen name='Tabs' component={Tabs} options={{ headerShown: false }}/>
      <Stack.Screen name='CalendarScreen' component={CalendarScreen}/>
    </Stack.Navigator>
  )
}

const styles = StyleSheet.create({})