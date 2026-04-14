import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, DefaultTheme as NavDefaultTheme } from '@react-navigation/native';
import AppNavigator from './src/navigation/AppNavigator';
import { AuthProvider } from './src/utils/AuthContext'
import ThemeProvider from './src/utils/ThemeContext';
import { useTheme } from './src/utils/ThemeContext';
import './src/utils/Notifications';
import { useEffect } from 'react';
import { DevSettings } from 'react-native';
import { injectTestDataForGraph } from 'src/utils/TestData';

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
    <AuthProvider>
      <NavigationContainer theme={navTheme}>
        <AppNavigator/>
      </NavigationContainer>
    </AuthProvider>
  );
}

export default function App() {
  useEffect(() => {
    if (__DEV__) {
      DevSettings.addMenuItem('Inject Graph Test Data', () => {
        injectTestDataForGraph();
      });
    }
  }, []);
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <MainApp />
      </ThemeProvider>
    </SafeAreaProvider>
  )
}

