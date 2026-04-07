import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Modal, ActivityIndicator, Alert, TextInput, Image } from 'react-native'
import { useMemo, useState, useEffect } from 'react'
import { useTheme } from '../utils/ThemeProvider'
import { Theme } from '../utils/Themes'
import { SafeAreaView } from 'react-native-safe-area-context'
import { AuthProps } from '../types/Auth'
import { auth, db } from '../../firebaseConfig'
import { doc, onSnapshot, serverTimestamp, setDoc, getDoc } from 'firebase/firestore'
import * as ImagePicker from 'expo-image-picker'
import { supabase } from '../../supabaseConfig'
import { Ionicons } from '@expo/vector-icons'
import Feather from '@expo/vector-icons/Feather'

const DEFAULT_AVATAR = 'https://cdn-icons-png.flaticon.com/512/149/149071.png'

type UserData = {
  username: string
  avatar: string
  level: number
}

export default function MenuScreen({ setIsLoggedIn }: AuthProps) {
    const { theme } = useTheme()
    const styles = useMemo(() => createStyles(theme), [theme])

    const [userData, setUserData] = useState({ avatar: DEFAULT_AVATAR, username: 'Loading ...', level: 1 })
    const [loading, setLoading] = useState(false)

    const [namePopupVisible, setNamePopupVisible] = useState(false)
    const [avatarPopupVisible, setAvatarPopupVisible] = useState(false)
    
    const[newName, setNewName] = useState('')

    useEffect(() => {
        const user = auth.currentUser
        if (!user) return

        const docRef = doc(db, 'users', user.uid)

        const unsubscribe = onSnapshot(docRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data() as UserData
                console.log('onSnapshot fired, new avatar:', data.avatar)
                setUserData(data)
                setNewName(data.username)
            }
        })
        return () => unsubscribe()
    }, [])

    const pickImage = async () => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync()
        if (status !== 'granted') {
            Alert.alert('Permission Denied', 'We need camera roll permissions to upload a photo.')
            return
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1,1],
            quality: 0.5
        })

        if (result.assets) {
            console.log('Picked uri: ', result.assets[0].uri)
        } else {
            console.log('Error picking image!')
        }

        if (!result.canceled) {
            uploadImage(result.assets[0].uri)
        } else {
            console.log('Failed to upload image!')
        }    
    }

    const uploadImage = async (uri: string) => {
        setLoading(true)
        try {
            const user = auth.currentUser
            if (!user) return

            const response = await fetch(uri)
            if (!response.ok) throw new Error(`Fetch failed ${response.status}`)

            const arrayBuffer = await response.arrayBuffer()
            const fileData = new Uint8Array(arrayBuffer)

            console.log('fileData length:', fileData.length)
            if (fileData.length === 0) throw new Error('Empty file data')

            const fileName = `${user.uid}.png`
            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(fileName, fileData, {
                    upsert: true,
                    contentType: 'image/png'
                })

            if (uploadError) {
                console.log('Upload error:', uploadError)
                throw uploadError
            }

            const publicUrlData = supabase.storage
                .from('avatars')
                .getPublicUrl(fileName)

            const publicUrl = publicUrlData.data.publicUrl

            const cacheBustedUrl = `${publicUrl}?t=${Date.now()}`
            console.log('Public URL:', cacheBustedUrl)

            await handleUpdate('avatar', cacheBustedUrl)
            setAvatarPopupVisible(false)
        } catch (err: any) {
            console.error('Upload error: ', err)
            Alert.alert('Upload failed', err.message)
        } finally {
            setLoading(false)
        }
    } 

    const handleUpdate = async (field: 'username' | 'avatar', value: string) => {
        if (!value.trim()) return Alert.alert('Error', 'Field cannot be empty')
        setLoading(true)
        try {
            const user = auth.currentUser
            if (!user) throw new Error('No user is logged in')
            const docRef = doc(db, 'users', user.uid)

            console.log('Updating Firestore:', field, value)

            await setDoc(docRef, {
                [field]: value,
                updatedAt: serverTimestamp()
            }, { merge: true })

            console.log('Firestore update successful')

            // Add direct read to verify
            const docSnap = await getDoc(docRef)
            if (docSnap.exists()) {
                const data = docSnap.data()
                console.log('Direct read after update:', data.avatar)
            }

            setNamePopupVisible(false)
            setAvatarPopupVisible(false)
        } catch (err: any) {
            Alert.alert('Error updating profile', err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <Text style={styles.headerTitle}>Menu</Text>

                <View style={styles.profileCard}>
                    <TouchableOpacity style={styles.avatarContainer} onPress={() => setAvatarPopupVisible(true)}>
                        <Image 
                            source={{ uri: userData.avatar || DEFAULT_AVATAR }} 
                            style={styles.avatarImage} 
                        />
                    </TouchableOpacity>
                    <View>
                        <View style={styles.editName}>
                            <Text style={styles.userName} onPress={() => setNamePopupVisible(true)}>{userData.username}</Text>
                            <Feather name="edit-3" size={20} color="white" />
                        </View>
                        <Text style={styles.userLevel}>{userData.level <= 3 ? 'Newbie feeder' : 'Senior feeder'}</Text>
                    </View>
                </View>

                <View style={styles.statsRow}>
                    <View style={styles.statBox}>
                        <Text style={styles.statValue}>48h</Text>
                        <Text style={styles.statLabel}>This Week</Text>
                    </View>
                    <View style={styles.statBox}>
                        <Text style={styles.statValue}>85%</Text>
                        <Text style={styles.statLabel}>Completed</Text>
                    </View>
                    <View style={styles.statBox}>
                        <Text style={styles.statValue}>142</Text>
                        <Text style={styles.statLabel}>Total</Text>
                    </View>
                </View>

                <View style={styles.menuList}>
                    <MenuLink 
                        icon="bar-chart-outline" 
                        title="Statistics" 
                        subtitle="View your study analytics" 
                        styles={styles} 
                        iconBg="#A8C2A0"
                    />
                    <MenuLink 
                        icon="settings-outline" 
                        title="Settings" 
                        subtitle="App preferences & notifications" 
                        styles={styles} 
                        iconBg="#A8C2A0"
                    />
                    <MenuLink 
                        icon="document-text-outline" 
                        title="Terms & Privacy" 
                        subtitle="Legal information & GDPR" 
                        styles={styles} 
                        iconBg="#DEE6D3"
                    />
                </View>

                <TouchableOpacity style={styles.logoutButton} onPress={() => setIsLoggedIn(false)}>
                    <Ionicons name="exit-outline" size={20} color="#6B8E7D" style={{marginRight: 8}} />
                    <Text style={styles.logoutText}>Log Out</Text>
                </TouchableOpacity>

                <Text style={styles.versionText}>Study Planner v1.0.0</Text>
            </ScrollView>

            <Modal visible={namePopupVisible} transparent animationType='fade'>
                <View style={styles.popupOverlay}>
                    <View style={styles.popupContent}>
                        <Text style={styles.popupTitle}>Edit Name</Text>
                        <TextInput
                            style={styles.input}
                            value={newName}
                            onChangeText={setNewName}
                            placeholder='Enter new name'
                            autoFocus
                        />
                        <View style={styles.popupButtons}>
                            <TouchableOpacity 
                                style={styles.cancelBtn}
                                onPress={() => setNamePopupVisible(false)}>
                                <Text>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.saveBtn}
                                onPress={() => handleUpdate('username', newName)}
                                disabled={loading}
                            >
                                {loading ? <ActivityIndicator color={theme.colors.text1}/> : <Text style={styles.saveBtnText}>Save</Text>}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            <Modal visible={avatarPopupVisible} transparent animationType='fade'>
                <View style={styles.popupOverlay}>
                    <View style={styles.popupContent}>
                        <Text style={styles.popupTitle}>Profile Picture</Text>
                        <Image
                            source={{ uri: userData.avatar || DEFAULT_AVATAR}}
                            style={styles.avatarImage}
                        />
                        <TouchableOpacity style={styles.uploadOption} onPress={pickImage} disabled={loading}>
                            {loading ? (
                                <ActivityIndicator color="#007AFF" />
                            ) : (
                                <>
                                    <View>
                                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                            <Ionicons name="image-outline" size={24} color="#007AFF" />
                                            <Text style={styles.uploadOptionText}>Upload New Photo</Text>
                                        </View>
                                    </View> 
                                </>
                            )}
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.cancelBtn2}
                            onPress={() => setAvatarPopupVisible(false)}
                            disabled={loading}    
                        >
                            <Text style={{ fontWeight: '600' }}>Close</Text>
                        </TouchableOpacity>

                        
                    </View>
                </View>
            </Modal>

        </SafeAreaView>
    )
}

// Sub-component for Menu Items
const MenuLink = ({ icon, title, subtitle, styles, iconBg }: any) => (
    <TouchableOpacity style={styles.menuItem}>
        <View style={[styles.menuIconContainer, {backgroundColor: iconBg}]}>
            <Ionicons name={icon} size={22} color="#4A5D45" />
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.menuItemTitle}>{title}</Text>
            <Text style={styles.menuItemSubtitle}>{subtitle}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color="#C4C4C4" />
    </TouchableOpacity>
)

const createStyles = (theme: Theme) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingBottom: 40,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: '700',
        color: '#2D3A29',
        marginVertical: 20,
    },
    profileCard: {
        backgroundColor: theme.colors.text2,
        borderRadius: 20,

        padding: 25,
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    avatarContainer: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: '#FFF',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    userName: {
        color: '#FFF',
        fontSize: 20,
        fontWeight: 'bold',
        paddingRight: 10
    },
    userLevel: {
        color: '#E0E0E0',
        fontSize: 14,
        marginTop: 4,
    },
    editName: {
        flexDirection: 'row',

    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    statBox: {
        backgroundColor: '#FFF',
        width: '31%',
        paddingVertical: 15,
        borderRadius: 15,
        alignItems: 'center',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
    },
    statValue: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#556B52',
    },
    statLabel: {
        fontSize: 11,
        color: '#8A9A85',
        marginTop: 5,
    },
    menuList: {
        gap: 12,
    },
    menuItem: {
        backgroundColor: '#FFF',
        borderRadius: 18,
        padding: 15,
        flexDirection: 'row',
        alignItems: 'center',
        elevation: 1,
    },
    menuIconContainer: {
        width: 45,
        height: 45,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    menuItemTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#2D3A29',
    },
    menuItemSubtitle: {
        fontSize: 12,
        color: '#6B8E7D',
        marginTop: 2,
    },
    logoutButton: {
        width: '100%',
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderColor: '#6B8E7D',
        padding: 15,
        borderRadius: 15,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 30,
    },
    logoutText: {
        color: '#6B8E7D',
        fontWeight: 'bold',
        fontSize: 16,
    },
    versionText: {
        textAlign: 'center',
        color: '#8A9A85',
        fontSize: 12,
        marginTop: 20,
    },
    popupOverlay: { 
        flex: 1, 
        backgroundColor: 'rgba(0,0,0,0.5)', 
        justifyContent: 'center', 
        alignItems: 'center' 
    },
    popupContent: { 
        width: '80%', 
        backgroundColor: 'white', 
        padding: 30, 
        borderRadius: 20, 
        alignItems: 'center' 
    },
    popupTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
    input: { 
        width: '100%', 
        borderWidth: 1, 
        borderColor: '#ddd', 
        padding: 10, 
        borderRadius: 10, 
        marginBottom: 20 
    },
    popupButtons: { flexDirection: 'row', justifyContent: 'space-between', width: '70%', gap: 10 },
    cancelBtn: { flex: 2, alignItems: 'center', padding: 10, backgroundColor: '#ced7e1', borderRadius: 10 },
    cancelBtn2: { alignItems: 'center', padding: 13, backgroundColor: '#ced7e1', borderRadius: 10, width: '100%' },
    saveBtn: { flex: 2, backgroundColor: '#007AFF', borderRadius: 10, alignItems: 'center', padding: 10 },
    saveBtnText: { color: 'white', fontWeight: 'bold' },
    logoutBtn: { marginTop: 40, padding: 15, alignItems: 'center' },
    uploadOption: { marginTop: 10, flexDirection: 'row', alignItems: 'center', padding: 15, backgroundColor: '#F0F7FF', borderRadius: 12, width: '100%', justifyContent: 'center', marginBottom: 10 },
    uploadOptionText: { marginLeft: 10, color: '#007AFF', fontWeight: 'bold' },
    avatarImage: { width: 70, height: 70, borderRadius: 35 },

})