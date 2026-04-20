import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, DefaultTheme as NavDefaultTheme } from '@react-navigation/native';
import AppNavigator from './src/navigation/AppNavigator';
import { AuthProvider } from './src/utils/AuthContext'
import ThemeProvider from './src/utils/ThemeContext';
import { useTheme } from './src/utils/ThemeContext';
import { FetchSessions } from 'src/utils/FetchSessions';
import { PreferencesProvider } from 'src/utils/SettingsContext';

function MainApp() {
  const { theme } = useTheme()
   const navTheme = {
    ...NavDefaultTheme, 
    colors: {
      ...NavDefaultTheme.colors, 
      background: theme.colors.background,
      primary: theme.colors.primary,
      card: theme.colors.text2,
      text: theme.colors.text1,
    },
  };
  
  return (
    <FetchSessions>
      <NavigationContainer theme={navTheme}>
        <AppNavigator/>
      </NavigationContainer>
    </FetchSessions>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <PreferencesProvider>
          <AuthProvider>
            <MainApp />
          </AuthProvider>
        </PreferencesProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  )
}

