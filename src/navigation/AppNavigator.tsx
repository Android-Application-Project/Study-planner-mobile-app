import { Alert, StyleSheet, ActivityIndicator, View, Platform} from 'react-native'
import { useEffect, useRef } from 'react'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { useAuth } from '../utils/AuthContext';
import { db } from '../../firebaseConfig';
import { Octicons, MaterialCommunityIcons, AntDesign } from '@expo/vector-icons';
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
import StatisticsScreen from '../screens/StatisticsScreen';
import LegalScreen from 'src/screens/LegalScreen';
import LeaderBoardScreen from 'src/screens/LeaderBoardScreen';
import { configureNotificationChannelAsync, ensureNotificationPermissionsAsync } from '../utils/Notifications';
import { useTheme } from '../utils/ThemeContext'
import { usePreferences } from 'src/utils/PreferencesContext';

const Stack = createNativeStackNavigator()
const Tab = createBottomTabNavigator()

function Tabs() {
  const { theme } = useTheme()
  const { strictModeEnabled } = usePreferences()
  return (
    <Tab.Navigator 
    screenOptions={({ route }) => ({
      headerShown: false,
      tabBarShowLabel: false,
      tabBarStyle: {
        backgroundColor: theme.colors.background,
        borderTopWidth: 2,
        borderTopColor: theme.colors.secondary1,
        height: Platform.OS === 'ios' ? 90 : 70,
        paddingBottom: Platform.OS === 'ios' ? 20 : 10,
      },
      tabBarIcon: ({ focused, color }) => {
        switch (route.name) {
          case 'Home':
            return <Octicons name={focused ? 'home' : 'home-fill'} size={24} color={color} />
          case 'Social':
            return <MaterialCommunityIcons name={focused ? 'account-group-outline' : 'account-group'} size={31} color={color} />
          case 'Create':
            return <MaterialCommunityIcons name={focused ? 'calendar-edit' : 'calendar-edit-outline'} size={30} color={color} />
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
        <Tab.Screen name='Menu' component={MenuScreen}/>
    </Tab.Navigator>
  )
}

export default function AppNavigator() {
  const { user, loading } = useAuth()
  const { theme } = useTheme()
  const promptedUserRef = useRef<string | null>(null)
  
  useEffect(() => {
    const maybePromptForNotifications = async (userId: string) => {
      if (promptedUserRef.current === userId) return
      promptedUserRef.current = userId

      const userRef = doc(db, 'users', userId)
      const snapshot = await getDoc(userRef)
      const data = snapshot.data()

      if (data?.notificationPrompted) {
        return
      }

      Alert.alert(
        'Allow Notifications',
        'Study Planner would like to send you notifications.',
        [
          {
            text: "Don't Allow",
            style: 'cancel',
            onPress: async () => {
              await setDoc(
                userRef,
                {
                  notificationPrompted: true,
                  notificationPreference: 'dismissed',
                  notificationPromptedAt: serverTimestamp(),
                },
                { merge: true },
              )
            },
          },
          {
            text: 'Allow',
            onPress: async () => {
              await configureNotificationChannelAsync()
              const granted = await ensureNotificationPermissionsAsync()
              await setDoc(
                userRef,
                {
                  notificationPrompted: true,
                  notificationPreference: granted ? 'enabled' : 'denied',
                  notificationPromptedAt: serverTimestamp(),
                },
                { merge: true },
              )
            },
          },
        ],
      )
    }

    if (user?.uid) {
      void maybePromptForNotifications(user.uid)
    } else {
      promptedUserRef.current = null
    }
  }, [user?.uid])

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
  )
}

  return (
    <Stack.Navigator screenOptions={{
      headerStyle: {
        backgroundColor: theme.colors.background, 
      },
      headerShadowVisible: false,
    }}>
      {user ? (
        <>
          <Stack.Screen name='Tabs' component={Tabs} options={{ headerShown: false }}/>
          <Stack.Screen name='CalendarScreen' component={CalendarScreen}/>
          <Stack.Screen name='RoomForStudyTogether' component={RoomForStudyTogether} options={{headerTitle: ''}}/>
          <Stack.Screen name='StatisticsScreen' component={StatisticsScreen} options={{title: 'Learning Analytics'}}/>
          <Stack.Screen name='LegalScreen' component={LegalScreen} options={{title: 'Privacy Policy'}}/>
          <Stack.Screen name='LeaderBoardScreen' component={LeaderBoardScreen} options={{title: ''}}/>
          <Stack.Screen name='RoomForIndependentStudy' component={RoomForIndependentStudy} options={{headerTitle: ''}}/>
        </>
      ) : (
        <>
          <Stack.Screen name='FirstScreen' component={FirstScreen} options={{ headerShown: false }}/>
          <Stack.Screen name='RegisterScreen' options={{ headerShown: false }}>
            {(props) => <RegisterScreen {...props} />}
          </Stack.Screen>  
          <Stack.Screen name="LoginScreen" options={{ headerShown: false }}>
            {(props) => <LogInScreen {...props}/>}
          </Stack.Screen>       
        </>
      )}
    </Stack.Navigator>
  )
}

const styles = StyleSheet.create({})
