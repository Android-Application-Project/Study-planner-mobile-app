import { StyleSheet, Text } from 'react-native'
import React from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'

export default function StoreScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <Text>StoreScreen</Text>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  }
})