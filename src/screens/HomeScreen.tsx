import { StyleSheet, Text, TouchableOpacity, Button } from 'react-native'
import React from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native';
import Entypo from '@expo/vector-icons/Entypo';
import { AuthProps } from '../types/Auth';

export default function HomeScreen() {
  const navigation = useNavigation<any>()
  return (
    <SafeAreaView style={styles.container}>
      <Text>HomeScreen</Text>
      <TouchableOpacity onPress={() => navigation.navigate('CalendarScreen')}>
        <Entypo name="calendar" size={24} color="black" />
      </TouchableOpacity>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  }
})