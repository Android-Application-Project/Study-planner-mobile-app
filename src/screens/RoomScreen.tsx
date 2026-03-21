import { StyleSheet, Text } from 'react-native'
import { useState } from 'react'
import SegmentedControl from '../components/SegmentedControl'
import { SafeAreaView } from 'react-native-safe-area-context'
import FriendScreen from './FriendScreen'

export default function RoomScreen() {
    const [index, setIndex] = useState(0)

    let content = (
      <Text>RoomScreen</Text>
    )
  return (
    <SafeAreaView style={styles.container}>
        <SegmentedControl
                    values={['Study together', 'Friends']}
                    selectedIndex={index}
                    onChange={setIndex}
                />
                {index === 0 ? (content) : <FriendScreen/>}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  }
})