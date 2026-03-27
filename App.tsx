import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, DefaultTheme as NavDefaultTheme } from '@react-navigation/native';
import AppNavigator from './src/navigation/AppNavigator';
import ThemeProvider from './src/utils/ThemeProvider';
import { useTheme } from './src/utils/ThemeProvider';
import { useFonts } from 'expo-font';

function MainApp() {
  const { theme } = useTheme()
   const navTheme = {
    ...NavDefaultTheme, // Start with the correct React Navigation structure
    colors: {
      ...NavDefaultTheme.colors, // Include required fields like 'border', 'notification'
      background: theme.colors.background,
      primary: theme.colors.primary,
      card: theme.colors.text2,
      text: theme.colors.text1,
    },
  };
  
  return (
    <NavigationContainer theme={navTheme}>
      <AppNavigator/>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <MainApp />
      </ThemeProvider>
    </SafeAreaProvider>
  )
}

