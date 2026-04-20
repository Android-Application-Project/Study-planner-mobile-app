import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Modal, ActivityIndicator, Alert, TextInput, Image, Switch } from 'react-native'
import { useMemo, useState, useEffect } from 'react'
import { useTheme } from '../utils/ThemeContext'
import { Theme } from '../utils/Themes'
import { SafeAreaView } from 'react-native-safe-area-context'
import { auth, db } from '../../firebaseConfig'
import { signOut } from 'firebase/auth'
import { doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore'
import * as ImagePicker from 'expo-image-picker'
import { supabase } from '../../supabaseConfig'
import { Ionicons } from '@expo/vector-icons'
import Feather from '@expo/vector-icons/Feather'
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import MenuLink from '../components/MenuLink'
import { useSessions } from 'src/utils/FetchSessions'
import { useNavigation, NavigationProp } from '@react-navigation/native'
import { usePreferences } from 'src/utils/SettingsContext'

const DEFAULT_AVATAR = 'https://cdn-icons-png.flaticon.com/512/149/149071.png'

type UserData = {
  username: string
  avatar: string
  coins: number
}

export default function MenuScreen() {
    const { theme } = useTheme()
    const styles = useMemo(() => createStyles(theme), [theme])
    const navigation = useNavigation<NavigationProp<any>>();

    const { sessions } = useSessions()

    const [userData, setUserData] = useState({ avatar: DEFAULT_AVATAR, username: 'Loading ...' })
    const [avatarLoading, setAvatarLoading] = useState(false)
    const [usernameLoading, setUsernameLoading] = useState(false)

    const [namePopupVisible, setNamePopupVisible] = useState(false)
    const [avatarPopupVisible, setAvatarPopupVisible] = useState(false)

    const { 
        vibrationEnabled, setVibrationEnabled,
        notificationsEnabled, setNotificationsEnabled,
        libraryAccessEnabled, setLibraryAccessEnabled,
        checkSystemNotifications
    } = usePreferences()

    const handleNotificationChange = async (value: boolean) => {
        if (value) {
            const isSystemAllowed = await checkSystemNotifications();
            if (!isSystemAllowed) {
                return; 
            }
        }
        setNotificationsEnabled(value);
    }
    
    const[newName, setNewName] = useState('')   

    useEffect(() => {
        const user = auth.currentUser
        if (!user) throw new Error('No user is logged in')

        const docRef = doc(db, 'users', user.uid)

        const unsubscribe = onSnapshot(docRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data() as UserData
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
        setAvatarLoading(true)
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
            setAvatarLoading(false)
        }
    } 

    const handleUpdate = async (field: 'username' | 'avatar', value: string) => {
        if (!value.trim()) return Alert.alert('Error', 'Field cannot be empty')
        setAvatarLoading(true)
        setUsernameLoading(true)
        try {
            const user = auth.currentUser
            if (!user) throw new Error('No user is logged in')
            const docRef = doc(db, 'users', user.uid)

            await setDoc(docRef, {
                [field]: value,
                updatedAt: serverTimestamp()
            }, { merge: true })

            setNamePopupVisible(false)
            setAvatarPopupVisible(false)
        } catch (err: any) {
            Alert.alert('Error updating profile', err.message)
        } finally {
            setAvatarLoading(false)
            setUsernameLoading(false)
        }
    }

    const completedRatio = sessions.length > 0
        ? Math.round((sessions.filter( session => session.completed).length / sessions.length) * 100)
        : 0

    const completedMinutes = sessions
        .filter(session => session.completed)
        .reduce(( sum, session ) => sum + session.minutes, 0)

    const completedHours = (completedMinutes / 60).toFixed(1)

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
                            <Text style={styles.userName}>{userData.username}</Text>
                            <Feather name="edit-3" size={20} color="white" onPress={() => setNamePopupVisible(true)}/>
                        </View>
                    </View>
                </View>

                <View style={styles.statsRow}>
                    <View style={styles.statBox}>
                        <Text style={styles.statValue}>12</Text>
                        <Text style={styles.statLabel}>This Week</Text>
                    </View>
                    <View style={styles.statBox}>
                        <Text style={styles.statValue}>{completedRatio}%</Text>
                        <Text style={styles.statLabel}>Completed</Text>
                    </View>
                    <View style={styles.statBox}>
                        <Text style={styles.statValue}>{completedHours}</Text>
                        <Text style={styles.statLabel}>Total Hours</Text>
                    </View>
                </View>

                <View style={{ marginTop: 10 }}>
                    <Text style={[styles.statLabel, { marginBottom: 10, marginLeft: 5 }]}>PREFERENCES</Text>
                    
                    <View style={styles.settingsGroup}>
                        <View style={styles.settingItem}>
                            <View style={styles.settingLeft}>
                                <MaterialIcons name="vibration" size={24} color="#556B52" />
                                <Text style={styles.settingText}>Vibration</Text>
                            </View>
                            <Switch 
                                value={vibrationEnabled} 
                                onValueChange={setVibrationEnabled}
                                trackColor={{ false: '#D1D1D1', true: '#A8C2A0' }}
                            />
                        </View>

                        <View style={styles.settingItem}>
                            <View style={styles.settingLeft}>
                                <Ionicons name="notifications-outline" size={22} color="#556B52" />
                                <Text style={styles.settingText}>Notifications</Text>
                            </View>
                            <Switch 
                                value={notificationsEnabled} 
                                onValueChange={handleNotificationChange}
                                trackColor={{ false: '#D1D1D1', true: '#A8C2A0' }}
                            />
                        </View>

                        <View style={styles.settingItem}>
                            <View style={styles.settingLeft}>
                                <Feather name="folder" size={22} color={theme.colors.primary} />
                                <Text style={styles.settingText}>Library Access</Text>
                            </View>
                            <Switch 
                                value={libraryAccessEnabled} 
                                onValueChange={setLibraryAccessEnabled}
                                trackColor={{ false: '#D1D1D1', true: '#A8C2A0' }}
                            />
                        </View>
                    </View>
                </View>

                <TouchableOpacity style={{ marginTop: 10 }} onPress={() => navigation.navigate('StatisticsScreen')}>
                    <Text style={[styles.statLabel, { marginBottom: 10, marginLeft: 5 }]}>STATISTICS</Text>
                    
                    <View style={styles.settingsGroup}>
                        <View style={styles.settingItem}>
                            <View style={styles.settingLeft}>
                                <Ionicons name="bar-chart-outline" size={24} color={theme.colors.primary} />
                                <Text style={styles.settingText}>Analytics</Text>
                            </View>
                            
                            <Ionicons name="chevron-forward" size={18} color="#C4C4C4" />
                        </View>
                    </View>
                </TouchableOpacity>


                <View style={styles.menuList}>
                    <MenuLink 
                        icon="settings-outline" 
                        title="Settings" 
                        subtitle="App preferences & notifications" 
                        styles={styles} 
                        iconBg="#A8C2A0"
                        screen='SettingScreen'
                    />
                    <MenuLink 
                        icon="document-text-outline" 
                        title="Terms & Privacy" 
                        subtitle="Legal information & GDPR" 
                        styles={styles} 
                        iconBg="#DEE6D3"
                    />
                </View>

                <TouchableOpacity style={styles.logoutButton} onPress={() => signOut(auth)}>
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
                                disabled={usernameLoading}
                            >
                                {usernameLoading ? <ActivityIndicator color={theme.colors.text1}/> : <Text style={styles.saveBtnText}>Save</Text>}
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
                        <TouchableOpacity style={styles.uploadOption} onPress={pickImage} disabled={avatarLoading}>
                            {avatarLoading ? (
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
                            disabled={avatarLoading}    
                        >
                            <Text style={{ fontWeight: '600' }}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

        </SafeAreaView>
    )
}

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
    settingsGroup: {
        backgroundColor: '#FFF',
        borderRadius: 20,
        paddingHorizontal: 15,
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
    },
    settingItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    settingLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    settingText: {
        fontSize: 16,
        color: '#2D3A29',
        fontWeight: '500',
    },
})