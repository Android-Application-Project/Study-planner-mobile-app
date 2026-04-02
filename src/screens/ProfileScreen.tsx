import { StyleSheet, Text, View, Button, TouchableOpacity } from 'react-native'
import { useMemo } from 'react'
import { useTheme } from '../utils/ThemeProvider'
import { Theme } from '../utils/Themes'
import { SafeAreaView } from 'react-native-safe-area-context'
import { AuthProps } from '../types/Auth'

export default function ProfileScreen({ setIsLoggedIn}: AuthProps) {
    const {theme, setTheme} = useTheme()
    const styles = useMemo(() => createStyles(theme), [theme])
  return (
    <SafeAreaView style={styles.container}>
        <Text style={styles.title}>ProfileScreen</Text>
        <Text  style={styles.title}>Setting Page</Text>
        <View>
            <Text  style={styles.title}>Choose Theme</Text>
            <Button title="Default" onPress={() => setTheme('default')} />
            <Button title="Blue" onPress={() => setTheme('blue')} />
            <Button title="Purple" onPress={() => setTheme('purple')} />
        </View>
            <TouchableOpacity style={styles.logoutButton} onPress={() => setIsLoggedIn(false)}>
                <Text>Log out</Text>
            </TouchableOpacity> 
    </SafeAreaView>
  )
}

const createStyles = (theme: Theme) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background
    },
    title: {
        color: theme.colors.text1
    },
    logoutButton: {
    width: '100%',
    backgroundColor: theme.colors.primary,
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10
  },
})