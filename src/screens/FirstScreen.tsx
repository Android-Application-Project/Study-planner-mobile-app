import { StyleSheet, Text, View, TouchableOpacity, Dimensions, Animated } from 'react-native'
import { useMemo, useEffect, useRef } from 'react'
import { useTheme } from '../utils/ThemeContext'
import { Theme } from '../utils/Themes'

const { width, height } = Dimensions.get('window')

export default function FirstScreen({ navigation }: any) {
  const { theme } = useTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  
  const animals = ["🐸","🐱","🦊","🐷","🐶"]
  const animations = useRef(animals.map(() => new Animated.Value(0))).current

  const startPositions = animals.map(() => Math.random() > 0.5 ? -100 : width + 100)
  const laneHeight = height * 0.5 / animals.length;
  const topPositions = animals.map((_, i) => i * laneHeight + 40)


  useEffect(() => {
    animations.forEach((animal, i) => {
      const from = startPositions[i]
      const to = from < 0 ? width + 100 : -100

      animal.setValue(from)

      Animated.loop(
        Animated.timing(animal, {
          toValue: to,
          duration: 2000 + Math.random() * 3000,
          useNativeDriver: true
        })
      ).start()
    })
  }, [])

  return (
    <View style={styles.container}>
      <View style={styles.animals}>
        {animals.map((animal, index) => (
          <Animated.Text 
            key={index}
            style={[styles.animal, { top: topPositions[index], transform: [{ translateX: animations[index] }]}]}
          >
            {animal}
          </Animated.Text>
        ))}
      </View>

      <View style={styles.buttonsContainer}>
          <TouchableOpacity style={styles.loginButton} onPress={() => navigation.navigate('LoginScreen')}>
            <Text style={styles.loginButtonText}>Login</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.registerButton} onPress={() => navigation.navigate('RegisterScreen')}>
            <Text style={styles.loginButtonText}>Register</Text>
          </TouchableOpacity>
      </View>
    </View>
  )
}

const createStyles = (theme: Theme) => StyleSheet.create({
  container: {
    flex: 1,
    paddingVertical: 80
  },
  buttonsContainer: {
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
  },
  animals: {
    flex: 1,
    paddingVertical: 80
  },
  animal: {
    position: "absolute",
    fontSize: 60
  },
  loginButton: {
      width: '100%',
      backgroundColor: theme.colors.primary,
      padding: 15,
      borderRadius: 12,
      alignItems: 'center',
      marginTop: 10
  },
  registerButton: {
      width: '100%',
      backgroundColor: theme.colors.secondary2,
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