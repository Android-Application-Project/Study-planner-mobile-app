import { StyleSheet, Text, View, TextInput, TouchableOpacity } from 'react-native'
import { useState, useMemo } from 'react'
import { Theme } from '../utils/Themes'
import { useTheme } from '../utils/ThemeContext'
import { auth } from '../../firebaseConfig'
import { signInWithEmailAndPassword } from 'firebase/auth'
import Feather from '@expo/vector-icons/Feather';

export default function LogInScreen({ navigation }: { navigation: any }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const { theme } = useTheme()
  const styles = useMemo(() => createStyles(theme), [theme])

  async function handleLogin() {
    if (!email || !password) {
      setError('Please enter email and password!')
      return
    }
    try {
      setError('')
      await signInWithEmailAndPassword(auth, email, password)
    } catch(err) {
      setError('Email or password is incorrect!')
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome Back</Text>
      <Text style={styles.subTitle}>We're excited to see you again!</Text>

      <TextInput
        placeholder='Email'
        placeholderTextColor={theme.colors.text2}
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
          placeholderTextColor={theme.colors.text2}
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
            name={showPassword ? "eye" : "eye-off"}
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
    paddingVertical: 100
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
    backgroundColor: theme.colors.card,
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
    marginTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  passwordContainer: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.card,
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
  },
  button: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  icon: {
    width: 24,
    height: 24,
    marginRight: 12,
  },
  text: {
    color: '#000',
    fontWeight: '500',
  },
})