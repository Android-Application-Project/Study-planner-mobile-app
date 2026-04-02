import { StyleSheet } from 'react-native'
import { useState } from 'react'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Octicons, MaterialCommunityIcons, MaterialIcons, AntDesign } from '@expo/vector-icons';
import HomeScreen from '../screens/HomeScreen'
import ProfileScreen from '../screens/ProfileScreen'
import RoomScreen from '../screens/RoomScreen'
import CreateScheduleScreen from '../screens/CreateScheduleScreen'
import StoreScreen from '../screens/StoreScreen'
import CalendarScreen from '../screens/CalendarScreen';
import FirstScreen from '../screens/FirstScreen';
import RegisterScreen from '../screens/RegisterScreen';
import LogInScreen from '../screens/LogInScreen';
import RoomForStudyTogether from '../screens/RoomForStudyTogether';
import RoomForIndependentStudy from '../screens/RoomForIndependentStudy';

const Stack = createNativeStackNavigator()
const Tab = createBottomTabNavigator()

function Tabs({ setIsLoggedIn }: { setIsLoggedIn: (val: boolean) => void }) {
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
                size={31} 
                color={color}
                />
              )
              case 'Create':
                return (
                  <MaterialIcons 
                  name={focused ? 'add-circle-outline' : 'add-circle'}
                  size={30} 
                  color={color}
                  />
                )
                case 'Store':
                  return (
                    <MaterialCommunityIcons 
                    name={focused ? 'storefront-outline' : 'storefront'}
                    size={30} 
                    color={color}
                    />
                  )
                  case 'Profile':
                    return (
                      <AntDesign name="menu" size={24} color={color} />
                    )
                  }
                }
              })}>
        <Tab.Screen name='Home' component={HomeScreen}/>       
        <Tab.Screen name='Social' component={RoomScreen}/>
        <Tab.Screen name='Create' component={CreateScheduleScreen}/>
        <Tab.Screen name='Store' component={StoreScreen}/>
        <Tab.Screen name='Profile'>
          {(props) => <ProfileScreen {...props} setIsLoggedIn={setIsLoggedIn}/>}
        </Tab.Screen>
    </Tab.Navigator>
  )
}

export default function AppNavigator() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  return (
    <Stack.Navigator>
      {isLoggedIn ? (
        <>
          <Stack.Screen name='Tabs' options={{ headerShown: false }}>
            {(props) => <Tabs {...props} setIsLoggedIn={setIsLoggedIn} />}
          </Stack.Screen>          
          <Stack.Screen name='CalendarScreen' component={CalendarScreen}/>
        </>
      ) : (
        <>
          <Stack.Screen name='FirstScreen' component={FirstScreen} options={{ headerShown: false }}/>
          <Stack.Screen
            name='RegisterScreen'
            options={{ headerShown: false }}
          >
            {(props) => <RegisterScreen {...props} setIsLoggedIn={setIsLoggedIn} />}
          </Stack.Screen>  
          <Stack.Screen
            name="LoginScreen"
            options={{ headerShown: false }}
          >
            {(props) => <LogInScreen {...props} setIsLoggedIn={setIsLoggedIn}/>}
          </Stack.Screen>       
        </>
      )}
      <Stack.Screen name='Tabs' options={{ headerShown: false }}>
        {(props) => <Tabs {...props} setIsLoggedIn={setIsLoggedIn} />}
      </Stack.Screen>
      <Stack.Screen name='CalendarScreen' component={CalendarScreen}/>
      <Stack.Screen name='RoomForStudyTogether' component={RoomForStudyTogether} options={{ headerShown: false}}/>
      <Stack.Screen name='RoomForIndependentStudy' component={RoomForIndependentStudy} options={{ headerShown: false}}/>
    </Stack.Navigator>
  )
}

const styles = StyleSheet.create({})