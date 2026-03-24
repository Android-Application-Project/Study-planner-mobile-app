import { StyleSheet, Text, View, TouchableOpacity } from 'react-native'
import { useMemo } from 'react'
import { useTheme } from '../utils/ThemeProvider'
import { Theme } from '../utils/Themes'

export default function FirstScreen({ navigation }: any) {
    const { theme } = useTheme()
    const styles = useMemo(() => createStyles(theme), [theme])

  return (
    <View style={styles.container}>
        <TouchableOpacity style={styles.loginButton} onPress={() => navigation.navigate('LoginScreen')}>
          <Text style={styles.loginButtonText}>Login</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.loginButton} onPress={() => navigation.navigate('RegisterScreen')}>
          <Text style={styles.loginButtonText}>Register</Text>
        </TouchableOpacity>
    </View>
  )
}

const createStyles = (theme: Theme) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20
    },

    loginButton: {
        width: '100%',
        backgroundColor: theme.colors.primary,
        padding: 15,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 10
    },

    loginButtonText: {
        color: theme.colors.text1,
        fontWeight: 'bold',
        fontSize: 16
    },
})