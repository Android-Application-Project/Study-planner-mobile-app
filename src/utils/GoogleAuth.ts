import * as WebBrowser from 'expo-web-browser'
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth'
import { auth } from '../../firebaseConfig'

WebBrowser.maybeCompleteAuthSession()


export const googleAuthConfig = {
    webClientId: '722986819408-bb8h8gldko0ero3uoffr00pa8g0h3aaa.apps.googleusercontent.com',
    iosClientId: '722986819408-5p92cq650i3crbbfh8dfp36evq5h5qdv.apps.googleusercontent.com'
}

export async function signInWithGoogle(promptAsync: any) {
    try {
        const result = await promptAsync()
        if (result?.type === 'success') {
            const { id_token } = result.params
            const credential = GoogleAuthProvider.credential(id_token)
            await signInWithCredential(auth, credential)
            return true
        } else {
            throw new Error('Google sign-in was failed')
        }
    } catch (err) {
        console.log('Google sign-in error: ', err)
        throw err
    }
}