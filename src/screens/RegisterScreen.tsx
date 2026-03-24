import { StyleSheet, Text, View, TextInput, TouchableOpacity } from 'react-native'
import { useState, useMemo } from 'react'
import { Theme } from '../utils/Themes'
import { useTheme } from '../utils/ThemeProvider'
import { auth } from '../../firebaseConfig'
import { createUserWithEmailAndPassword } from 'firebase/auth'
import { FirebaseError } from 'firebase/app'


export default function registerScreen({ navigation, setIsLoggedIn }: { navigation: any, setIsLoggedIn: (value: boolean) => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const { theme } = useTheme()
  const styles = useMemo(() => createStyles(theme), [theme])

  async function handleRegister() {
    try {
      setError('')
      await createUserWithEmailAndPassword(auth, email, password)
      setIsLoggedIn(true)
    } catch(err) {
      const error = err as FirebaseError

      if (error.code === 'auth/email-already-in-use') {
        setError('User already exists.')
      } else if (error.code === 'auth/invalid-email') {
        setError('Invalid email address.')
      } else if (error.code === 'auth/weak-password') {
        setError('Password should be at least 6 characters.')
      } else {
        setError(error.message)
      }

      setIsLoggedIn(false)
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Welcome</Text>

        <TextInput
          placeholder='Email'
          style={styles.input}
          value={email}
          onChangeText={setEmail}
        />

        <TextInput
          placeholder='Password'
          style={styles.input}
          value={password}
          secureTextEntry
          onChangeText={setPassword}
        />

        {error ?
          <Text style={styles.errorMessage}>{error}</Text>
          : null
        }

        <TouchableOpacity style={styles.registerButton} onPress={handleRegister}>
          <Text style={styles.registerButtonText}>Register</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.registerButton, styles.googleButton]}
          onPress={() => console.log('Hi!')}
        >
          <Text style={styles.registerButtonText}>Register with Google</Text>
        </TouchableOpacity>

        <View style={styles.signupContainer}>
          <Text style={styles.signupText}>Already have an account?</Text>
          <TouchableOpacity onPress={() => navigation.replace('LoginScreen')}>
            <Text style={styles.signupButtonText}> Log In</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  )
}

const createStyles = (theme: Theme) => StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    padding: 20
  },
  card: {
    width: '90%',
    padding: 30,
    borderRadius: 20,
    backgroundColor: theme.colors.card,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
    alignItems: 'center'
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 20
  },
  input: {
    width: '100%',
    backgroundColor: theme.colors.background,
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
    color: theme.colors.text
  },
  registerButton: {
    width: '100%',
    backgroundColor: theme.colors.primary,
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10
  },
  googleButton: {
    backgroundColor: '#DB4437',
  },
  registerButtonText: {
    color: theme.colors.text1,
    fontWeight: 'bold',
    fontSize: 16
  },
  signupContainer: {
    flexDirection: 'row',
    marginTop: 15
  },
  signupText: {
    color: theme.colors.text
  },
  signupButtonText: {
    color: theme.colors.primary,
    fontWeight: 'bold'
  },
  errorMessage: {
    color: theme.colors.notification
  }
})