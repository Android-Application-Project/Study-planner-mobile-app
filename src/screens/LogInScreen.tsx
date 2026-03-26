import { StyleSheet, Text, View, TextInput, TouchableOpacity } from 'react-native'
import { useState, useMemo } from 'react'
import { Theme } from '../utils/Themes'
import { useTheme } from '../utils/ThemeProvider'
import { auth } from '../../firebaseConfig'
import { signInWithEmailAndPassword } from 'firebase/auth'
import * as Google from 'expo-auth-session/providers/google'
import { signInWithGoogle, googleAuthConfig } from '../utils/GoogleAuth'
import Feather from '@expo/vector-icons/Feather';


export default function LogInScreen({ navigation, setIsLoggedIn }: { navigation: any; setIsLoggedIn: (value: boolean) => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const { theme } = useTheme()
  const styles = useMemo(() => createStyles(theme), [theme])

  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: googleAuthConfig.webClientId,
    iosClientId: googleAuthConfig.iosClientId,
    scopes: ['profile', 'email']
  })

  const handleGoogle = async () => {
    try {
      setError('')
      const result = await signInWithGoogle(promptAsync)
      if (result) setIsLoggedIn(true)
    } catch (err) {
      console.log('Error handleGoogle: ', err)
      setError('Google sign-in failed')
      setIsLoggedIn(false)
    }
  }

  async function handleLogin() {
    if (!email || !password) {
      setError('Please enter email and password!')
      return
    }
    try {
      setError('')
      await signInWithEmailAndPassword(auth, email, password)
      setIsLoggedIn(true)
    } catch(err) {
      setError('Email or password is incorrect!')
      setIsLoggedIn(false)
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome Back</Text>
      <Text style={styles.subTitle}>We're excited to see you again!</Text>

      <TextInput
        placeholder='Email'
        style={styles.input}
        value={email}
        onChangeText={setEmail}
      />

      {error ? 
        <Text style={styles.errorMessage}>{error}</Text>
        : null
      }
      
      <View style={styles.passwordContainer}>
        <TextInput
          placeholder="Password"
          style={styles.passwordInput}
          value={password}
          secureTextEntry={!showPassword}
          onChangeText={setPassword}
        />

        <TouchableOpacity
          style={styles.eyeIcon}
          onPress={() => setShowPassword(!showPassword)}
        >
          <Feather
            name={showPassword ? "eye-off" : "eye"}
            size={22}
            color="gray"
          />
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
        <Text style={styles.loginButtonText}>Login</Text>
      </TouchableOpacity>

      <View style={styles.orContainer}>
        <View style={styles.orLine} />
        <Text style={styles.orText}>or</Text>
        <View style={styles.orLine} />
      </View>

      <TouchableOpacity
        style={[styles.loginButton, styles.googleButton]}
        onPress={handleGoogle}
        disabled={!request}
      >
        <Text style={styles.loginButtonText}>Google</Text>
      </TouchableOpacity>

      <View style={styles.signupContainer}>
        <Text style={styles.signupText}>Don't have an account?</Text>
        <TouchableOpacity onPress={() => navigation.replace('RegisterScreen')}>
          <Text style={styles.signupButtonText}> Sign Up</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const createStyles = (theme: Theme) => StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    paddingHorizontal: 20,
    paddingVertical: 80
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 20
  },
  subTitle: {
    fontSize: 18,
    fontWeight: 'normal',
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
  loginButton: {
    width: '100%',
    backgroundColor: theme.colors.primary,
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10
  },
  passwordContainer: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    borderRadius: 12,
    marginBottom: 15,
  },

  passwordInput: {
    flex: 1,
    padding: 15,
    color: theme.colors.text
  },

  eyeIcon: {
    paddingHorizontal: 12
  },
  orContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 15
  },

  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#ccc'
  },

  orText: {
    marginHorizontal: 10,
    color: theme.colors.text
  },
  googleButton: {
    backgroundColor: '#e59c95',
  },
  loginButtonText: {
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