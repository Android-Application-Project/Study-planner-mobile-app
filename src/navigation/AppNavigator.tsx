import { StyleSheet } from 'react-native'
import { useEffect, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { auth } from '../../firebaseConfig';
import { Octicons, MaterialCommunityIcons, MaterialIcons, AntDesign } from '@expo/vector-icons';
import HomeScreen from '../screens/HomeScreen'
import MenuScreen from '../screens/MenuScreen'
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
            return <Octicons name={focused ? 'home' : 'home-fill'} size={24} color={color} />
          case 'Social':
            return <MaterialCommunityIcons name={focused ? 'account-group-outline' : 'account-group'} size={31} color={color} />
          case 'Create':
            return <MaterialIcons name={focused ? 'add-circle-outline' : 'add-circle'} size={30} color={color} />
          case 'Store':
            return <MaterialCommunityIcons name={focused ? 'storefront-outline' : 'storefront'} size={30} color={color} />
          case 'Menu':
            return <AntDesign name="menu" size={24} color={color} />
        }
      }
    })}>
        <Tab.Screen name='Home' component={HomeScreen}/>       
        <Tab.Screen name='Social' component={RoomScreen}/>
        <Tab.Screen name='Create' component={CreateScheduleScreen}/>
        <Tab.Screen name='Store' component={StoreScreen}/>
        <Tab.Screen name='Menu' options={{ headerShown: false}}>
              {(props) => <MenuScreen {...props} setIsLoggedIn={setIsLoggedIn}/>}
        </Tab.Screen>
    </Tab.Navigator>
  )
}

export default function AppNavigator() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsLoggedIn(!!user)
    })
    return unsubscribe
  }, [])

  return (
    <Stack.Navigator>
      {isLoggedIn ? (
        <>
          <Stack.Screen name='Tabs' options={{ headerShown: false }}>
            {(props) => <Tabs {...props} setIsLoggedIn={setIsLoggedIn} />}
          </Stack.Screen>          
          <Stack.Screen name='CalendarScreen' component={CalendarScreen}/>
          <Stack.Screen name='RoomForStudyTogether' component={RoomForStudyTogether} options={{ headerShown: false}}/>
          <Stack.Screen name='RoomForIndependentStudy' component={RoomForIndependentStudy} options={{ headerShown: false}}/>
        </>
      ) : (
        <>
          <Stack.Screen name='FirstScreen' component={FirstScreen} options={{ headerShown: false }}/>
          <Stack.Screen name='RegisterScreen' options={{ headerShown: false }}>
            {(props) => <RegisterScreen {...props} setIsLoggedIn={setIsLoggedIn} />}
          </Stack.Screen>  
          <Stack.Screen name="LoginScreen" options={{ headerShown: false }}>
            {(props) => <LogInScreen {...props} setIsLoggedIn={setIsLoggedIn}/>}
          </Stack.Screen>       
        </>
      )}
    </Stack.Navigator>
  )
}

const styles = StyleSheet.create({})