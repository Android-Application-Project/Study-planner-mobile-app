import { StyleSheet, Text, View, TextInput, TouchableOpacity, Image } from 'react-native'
import { useState, useMemo } from 'react'
import { Theme } from '../utils/Themes'
import { useTheme } from '../utils/ThemeContext'
import { db, auth } from '../../firebaseConfig'
import { doc, setDoc } from 'firebase/firestore'
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth'
import { FirebaseError } from 'firebase/app'
import Feather from '@expo/vector-icons/Feather';

export default function registerScreen({ navigation }: { navigation: any }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const { theme } = useTheme()
  const styles = useMemo(() => createStyles(theme), [theme])

  async function handleRegister() {
    try {
      setError('')
      const userCredential = await createUserWithEmailAndPassword(auth, email, password)
      await updateProfile(userCredential.user, { displayName: username })
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        username: username,
        email: email,
        coins: 0,
        createdAt: new Date()
      })

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
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome</Text>
      <Text style={styles.subTitle}>Let's locked in together!</Text>

      <TextInput
        placeholder='Email'
        style={styles.input}
        value={email}
        onChangeText={setEmail}
      />

      <TextInput
        placeholder='Username'
        style={styles.input}
        value={username}
        onChangeText={setUsername}
      />

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
            name={showPassword ? "eye" : "eye-off"}
            size={22}
            color="gray"
          />
        </TouchableOpacity>
      </View>

      {error ?
        <Text style={styles.errorMessage}>{error}</Text>
        : null
      }

      <TouchableOpacity style={styles.registerButton} onPress={handleRegister}>
        <Text style={styles.registerButtonText}>Register</Text>
      </TouchableOpacity>

      <View style={styles.orContainer}>
        <View style={styles.orLine} />
        <Text style={styles.orText}>or</Text>
        <View style={styles.orLine} />
      </View>

      <View style={styles.signupContainer}>
        <Text style={styles.signupText}>Already have an account?</Text>
        <TouchableOpacity onPress={() => navigation.replace('LoginScreen')}>
          <Text style={styles.signupButtonText}> Log In</Text>
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
  registerButton: {
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