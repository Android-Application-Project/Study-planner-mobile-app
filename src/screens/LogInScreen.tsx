import { StyleSheet, Text, View, TextInput, Button } from 'react-native'
import { useState } from 'react'

export default function LogInScreen() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
  return (
    <View style={styles.container}>
        <TextInput
            placeholder='Email'
            style={styles.input}
            onChangeText={setEmail}
        />

        <TextInput
            placeholder='Password'
            style={styles.input}
            onChangeText={setPassword}
        />

        <Button title='Login' onPress={}/>
    </View>
  )
}

const styles = StyleSheet.create({
    container: { flex:1, justifyContent:"center", padding:20 },
    input: { borderWidth:1, marginBottom:10, padding:10 }
})