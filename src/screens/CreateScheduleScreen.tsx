import { StyleSheet, Text } from 'react-native'
import { useState } from 'react'
import SegmentedControl from '../components/SegmentedControl'
import { SafeAreaView } from 'react-native-safe-area-context'
import CreateRoomScreen from './CreateRoomScreen'

export default function CreateScheduleScreen() {
    const [index, setIndex] = useState(0)

    let content = (
        <Text>CreateScheduleScreen</Text>
    )

  return (
    <SafeAreaView style={styles.container}>
        <SegmentedControl
            values={['Add Schedule', 'Add Room']}
            selectedIndex={index}
            onChange={setIndex}
        />
        {index === 0 ? (content) : <CreateRoomScreen/>}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
    container: {
        flex: 1
    }
})