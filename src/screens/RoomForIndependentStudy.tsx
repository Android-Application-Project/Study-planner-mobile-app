import { StyleSheet, Text, View, TouchableOpacity, Animated, Easing, FlatList, Image, Alert, Modal, Dimensions, ScrollView, TextInput } from 'react-native'
import React, { useState, useMemo, useEffect, useRef } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation, useRoute } from '@react-navigation/native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { doc, onSnapshot, updateDoc, arrayRemove, increment, collection, addDoc, query, where, getDoc, getDocs, serverTimestamp, orderBy, limit } from 'firebase/firestore';
import { db, auth } from '../../firebaseConfig';
import { useTheme } from '../utils/ThemeProvider';
import { Theme } from '../utils/Themes'; 

const { width } = Dimensions.get('window');
const QUICK_PHRASES = ["Focusing! 📚", "Break time ☕", "Almost done", "Keep going!", "BRB"];
const EMOJIS = ["👍", "🔥", "💯", "📚", "😴", "💡"];
const AMBIENT_SOUNDS = [
  { id: 'none', name: 'Silent', icon: 'volume-x', file: null },
  { id: 'rain', name: 'Rain', icon: 'cloud-rain', file: require('../assets/sounds/rain.mp3') },
  { id: 'cafe', name: 'Cafe', icon: 'coffee', file: require('../assets/sounds/cafe.mp3') },
];

const ProfileAvatar = ({ avatar, size, bgColor }: { avatar: string, size: number, bgColor: string }) => {
  const radius = size / 2;
  return (
    <View style={{ width: size, height: size, borderRadius: radius, backgroundColor: bgColor, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
      {avatar && avatar.startsWith('http') ? (
        <Image source={{ uri: avatar }} style={{ width: size, height: size }} />
      ) : (
        <Text style={{ fontSize: size * 0.4 }}>{avatar || '👤'}</Text>
      )}
    </View>
  );
};

export default function RoomForIndependentStudy() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const { roomId, roomName, icon } = route.params || {};
  const currentUserId = auth.currentUser?.uid;

  const [activeUsers, setActiveUsers] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const [focusMinutes, setFocusMinutes] = useState(25);
  const [breakMinutes, setBreakMinutes] = useState(5);
  const [totalSessions, setTotalSessions] = useState(4);
  const [currentSession, setCurrentSession] = useState(1);
  const [subject, setSubject] = useState('General Study');

  const [timeLeft, setTimeLeft] = useState(focusMinutes * 60); 
  const [isActive, setIsActive] = useState(false);
  const [isBreak, setIsBreak] = useState(false); 

  const [isChatModalVisible, setChatModalVisible] = useState(false);
  const [isSoundModalVisible, setSoundModalVisible] = useState(false);
  const [isSettingsModalVisible, setSettingsModalVisible] = useState(false);

  const [selectedSoundId, setSelectedSoundId] = useState('none');
  const soundObject = useRef<Audio.Sound | null>(null);
  const animatedTimeLeft = useRef(new Animated.Value(focusMinutes * 60)).current;

  useEffect(() => {
    Audio.setAudioModeAsync({ allowsRecordingIOS: false, playsInSilentModeIOS: true, shouldDuckAndroid: true, staysActiveInBackground: true });
    return () => { if (soundObject.current) { soundObject.current.unloadAsync(); } };
  }, []);

  useEffect(() => {
    if (!roomId || !db) return;
    const roomRef = doc(db, 'rooms', roomId);
    const unsubscribe = onSnapshot(roomRef, (docSnap) => {
      if (docSnap.exists()) { setActiveUsers(docSnap.data().activeUsers || []); }
    });
    return () => unsubscribe();
  }, [roomId]);

  useEffect(() => {
    if (!roomId || !db) return;
    const messagesRef = collection(db, 'rooms', roomId, 'messages');
    const qLatest = query(messagesRef, orderBy('createdAt', 'desc'), limit(1));
    const unsubscribeLatest = onSnapshot(qLatest, (snapshot) => {
      if (!snapshot.empty) {
        const msg = snapshot.docs[0].data();
        if (msg.senderId !== currentUserId && !isChatModalVisible) { setUnreadCount(prev => prev + 1); }
      }
    });
    const qAll = query(messagesRef, orderBy('createdAt', 'desc'), limit(30));
    const unsubscribeAll = onSnapshot(qAll, (snapshot) => { setMessages(snapshot.docs.map(d => ({ id: d.id, ...d.data() }))); });
    return () => { unsubscribeLatest(); unsubscribeAll(); };
  }, [roomId, isChatModalVisible]);

  const syncMyStatusToFirebase = async () => {
    if (!currentUserId || !roomId) return;
    try {
      const roomRef = doc(db, 'rooms', roomId);
      const roomSnap = await getDoc(roomRef);
      if (roomSnap.exists()) {
        const users = roomSnap.data().activeUsers || [];
        const updatedUsers = users.map((u: any) => {
          if (u.id === currentUserId) {
            return { 
                ...u, 
                subject, 
                status: isActive ? (isBreak ? 'Resting' : 'Focusing') : 'Paused', 
                timeLeft, 
                currentSession, 
                totalSessions 
            };
          }
          return u;
        });
        await updateDoc(roomRef, { activeUsers: updatedUsers });
      }
    } catch (e) { console.log(e); }
  };

  useEffect(() => {
    const interval = setInterval(syncMyStatusToFirebase, 5000);
    return () => clearInterval(interval);
  }, [isActive, isBreak, subject, timeLeft, currentSession]);

  useEffect(() => {
    let interval: any = null;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    } else if (isActive && timeLeft === 0) {
      clearInterval(interval);
      let nextIsBreak = !isBreak;
      let nextSession = currentSession;
      if (!nextIsBreak) nextSession += 1;
      if (nextSession > totalSessions && !nextIsBreak) {
        setIsActive(false); setIsBreak(false); setTimeLeft(focusMinutes * 60); setCurrentSession(1);
        Alert.alert("Completed! 🎉");
      } else {
        setIsBreak(nextIsBreak);
        setCurrentSession(nextSession);
        setTimeLeft((nextIsBreak ? breakMinutes : focusMinutes) * 60);
        setIsActive(false);
      }
      syncMyStatusToFirebase();
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft]);

  useEffect(() => {
    Animated.timing(animatedTimeLeft, {
      toValue: timeLeft,
      duration: isActive && timeLeft > 0 ? 1000 : 0,
      easing: Easing.linear,
      useNativeDriver: true,
    }).start();
  }, [isActive, timeLeft]);

  const rotateAnimation = animatedTimeLeft.interpolate({
    inputRange: [0, (isBreak ? breakMinutes : focusMinutes) * 60],
    outputRange: ['360deg', '0deg'],
  });

  const handleToggleTimer = () => {
    const newActiveState = !isActive;
    setIsActive(newActiveState);
    setTimeout(syncMyStatusToFirebase, 500);
  };

  const handleSoundSelect = async (soundItem: any) => {
    if (soundObject.current) { await soundObject.current.stopAsync(); await soundObject.current.unloadAsync(); soundObject.current = null; }
    setSelectedSoundId(soundItem.id);
    if (soundItem.id !== 'none' && soundItem.file) {
      const { sound } = await Audio.Sound.createAsync(soundItem.file, { shouldPlay: true, isLooping: true, volume: 0.5 });
      soundObject.current = sound;
    }
  };

  const handleLeaveRoom = async () => {
    if (!currentUserId || !roomId) { navigation.goBack(); return; }
    const myUserObj = activeUsers.find(u => u.id === currentUserId);
    if (myUserObj) { await updateDoc(doc(db, 'rooms', roomId), { members: increment(-1), activeUsers: arrayRemove(myUserObj) }); }
    navigation.goBack();
  };

  const sendQuickMessage = async (text: string) => {
    if (!currentUserId || !roomId) return;
    const myUserObj = activeUsers.find(u => u.id === currentUserId);
    await addDoc(collection(db, 'rooms', roomId, 'messages'), {
      text, senderId: currentUserId, senderName: myUserObj?.name || 'User', senderAvatar: myUserObj?.avatar || '', createdAt: serverTimestamp()
    });
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const renderMateCard = ({item}: {item: any}) => (
    <View style={styles.mateCard}>
      <ProfileAvatar avatar={item.avatar} size={45} bgColor="#F3F4F6" />
      <View style={styles.mateInfo}>
        <View style={{flexDirection: 'row', alignItems: 'center'}}>
            <Text style={styles.mateName}>{item.name} {item.id === currentUserId && '(You)'}</Text>
            {item.subject && (
                <View style={styles.mateSubjectBadge}>
                    <Text style={styles.mateSubjectText}>{item.subject}</Text>
                </View>
            )}
        </View>
        <Text style={styles.mateSub}>Session {item.currentSession || 1}/{item.totalSessions || 4}</Text>
      </View>
      <View style={styles.mateStatus}>
        <Text style={[styles.mateTime, { color: item.status === 'Focusing' ? theme.colors.primary : '#F59E0B' }]}>{formatTime(item.timeLeft || 0)}</Text>
        <Text style={styles.mateStatusText}>{item.status || 'Paused'}</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={handleLeaveRoom}><Feather name="arrow-left" size={24} color={theme.colors.text1} /></TouchableOpacity>
        <View style={styles.titleContainer}>
          <Text style={styles.roomTitleText}>{icon} {roomName}</Text>
          <View style={styles.mySubjectPill}><Text style={styles.mySubjectPillText}>{subject}</Text></View>
        </View>
        <TouchableOpacity style={styles.iconBtn} onPress={() => setSettingsModalVisible(true)}><Feather name="settings" size={22} color={theme.colors.text1} /></TouchableOpacity>
      </View>

      <View style={styles.timerSection}>
        <View style={styles.sessionDots}>
           {[...Array(totalSessions)].map((_, i) => (
             <View key={i} style={[styles.dot, i + 1 < currentSession && styles.dotDone, i + 1 === currentSession && styles.dotActive]} />
           ))}
        </View>
        <View style={styles.timerCircle}>
          <View style={styles.timerInner}><Text style={styles.timeText}>{formatTime(timeLeft)}</Text><Text style={styles.statusLabel}>{isActive ? (isBreak ? 'BREAK' : 'FOCUS') : 'READY'}</Text></View>
          <Animated.View style={[styles.rotator, { transform: [{ rotate: rotateAnimation }] }]}><View style={styles.progressPoint} /></Animated.View>
        </View>
        <View style={styles.controlRow}>
           <TouchableOpacity style={styles.actionBtn} onPress={() => setSoundModalVisible(true)}><Feather name="music" size={20} color={theme.colors.text1} /></TouchableOpacity>
           <TouchableOpacity style={styles.mainBtn} onPress={handleToggleTimer}><Text style={styles.mainBtnText}>{isActive ? 'PAUSE' : 'START'}</Text></TouchableOpacity>
           <TouchableOpacity style={styles.actionBtn} onPress={() => { setChatModalVisible(true); setUnreadCount(0); }}>
              <Feather name="message-circle" size={20} color={theme.colors.text1} />
              {unreadCount > 0 && <View style={styles.badge}><Text style={styles.badgeText}>{unreadCount}</Text></View>}
           </TouchableOpacity>
        </View>
      </View>

      <View style={styles.listSection}>
        <Text style={styles.listTitle}>Roommates ({activeUsers.length})</Text>
        <FlatList data={activeUsers} keyExtractor={item => item.id} renderItem={renderMateCard} />
      </View>

      <Modal visible={isSettingsModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}><View style={styles.modalContent}>
            <View style={styles.modalHeader}><Text style={styles.modalTitle}>Timer Settings</Text><TouchableOpacity onPress={() => setSettingsModalVisible(false)}><Feather name="x" size={24}/></TouchableOpacity></View>
            <View style={styles.settingItem}>
                <Text style={styles.inputLabel}>What are you focusing on?</Text>
                <TextInput style={styles.textInput} value={subject} onChangeText={setSubject} placeholder="e.g. Coding, Math, Reading..." placeholderTextColor="#999" />
            </View>
            <View style={styles.settingItem}>
                <Text style={styles.inputLabel}>Focus Minutes: {focusMinutes}</Text>
                <View style={styles.stepper}><TouchableOpacity style={styles.stepBtn} onPress={()=>setFocusMinutes(Math.max(5, focusMinutes-5))}><Feather name="minus" size={20}/></TouchableOpacity><View style={styles.stepVal}><Text style={styles.stepValText}>{focusMinutes}</Text></View><TouchableOpacity style={styles.stepBtn} onPress={()=>setFocusMinutes(focusMinutes+5)}><Feather name="plus" size={20}/></TouchableOpacity></View>
            </View>
            <TouchableOpacity style={styles.confirmBtn} onPress={()=>{ setSettingsModalVisible(false); setTimeLeft(focusMinutes*60); setIsActive(false); syncMyStatusToFirebase(); }}><Text style={{color:'#FFF',fontWeight:'bold',fontSize:16}}>Apply & Reset Timer</Text></TouchableOpacity>
        </View></View>
      </Modal>

      <Modal visible={isChatModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}><View style={[styles.modalContent, {height:'80%'}]}>
            <View style={styles.modalHeader}><Text style={styles.modalTitle}>Chat</Text><TouchableOpacity onPress={()=>setChatModalVisible(false)}><Feather name="x" size={24}/></TouchableOpacity></View>
            <FlatList data={messages} inverted keyExtractor={item=>item.id} renderItem={({item}:any)=>(<View style={[styles.msgRow, item.senderId===currentUserId && {justifyContent:'flex-end'}]}><View style={[styles.msgBox, item.senderId===currentUserId ? {backgroundColor:theme.colors.primary} : {backgroundColor:'#FFF'}]}><Text style={{color:item.senderId===currentUserId?'#FFF':theme.colors.text1}}>{item.text}</Text></View></View>)} />
            <View style={styles.quickInput}><ScrollView horizontal showsHorizontalScrollIndicator={false}>{QUICK_PHRASES.map(p=>(<TouchableOpacity key={p} onPress={()=>sendQuickMessage(p)} style={styles.quickPill}><Text style={styles.quickPillText}>{p}</Text></TouchableOpacity>))}</ScrollView></View>
        </View></View>
      </Modal>

      <Modal visible={isSoundModalVisible} animationType="fade" transparent>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={()=>setSoundModalVisible(false)}><View style={styles.modalContent}>
            <Text style={[styles.modalTitle, {marginBottom:20}]}>Ambient Sounds</Text>
            {AMBIENT_SOUNDS.map(s=>(<TouchableOpacity key={s.id} onPress={()=>handleSoundSelect(s)} style={[styles.soundRow, selectedSoundId===s.id && {backgroundColor:'#E5EDDF'}]}><Feather name={s.icon as any} size={20} color={theme.colors.text1}/><Text style={{marginLeft:15, fontWeight:'600', color:theme.colors.text1}}>{s.name}</Text></TouchableOpacity>))}
        </View></TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 10 },
  iconBtn: { padding: 10, backgroundColor: '#FFF', borderRadius: 20, elevation: 2 },
  titleContainer: { alignItems: 'center' },
  roomTitleText: { fontSize: 18, fontWeight: '800', color: theme.colors.text1 },
  mySubjectPill: { backgroundColor: '#E5EDDF', paddingVertical: 2, paddingHorizontal: 10, borderRadius: 10, marginTop: 4 },
  mySubjectPillText: { fontSize: 10, fontWeight: '700', color: theme.colors.primary },
  timerSection: { alignItems: 'center', paddingVertical: 20 },
  sessionDots: { flexDirection: 'row', marginBottom: 20 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#DDD', marginHorizontal: 4 },
  dotDone: { backgroundColor: theme.colors.text1 },
  dotActive: { backgroundColor: theme.colors.primary, transform: [{scale: 1.2}] },
  timerCircle: { width: 260, height: 260, borderRadius: 130, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', elevation: 5 },
  timerInner: { alignItems: 'center' },
  timeText: { fontSize: 60, fontWeight: '200', color: theme.colors.text1, fontVariant:['tabular-nums'] },
  statusLabel: { fontSize: 14, fontWeight: '800', letterSpacing: 3, color: theme.colors.primary },
  rotator: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'flex-start', alignItems: 'center' },
  progressPoint: { width: 14, height: 14, borderRadius: 7, backgroundColor: theme.colors.primary, marginTop: -7, borderWidth: 3, borderColor: '#FFF' },
  controlRow: { flexDirection: 'row', alignItems: 'center', marginTop: 30 },
  actionBtn: { width: 45, height: 45, borderRadius: 23, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', elevation: 3, position: 'relative' },
  mainBtn: { backgroundColor: theme.colors.text1, paddingHorizontal: 40, paddingVertical: 15, borderRadius: 30, marginHorizontal: 20, elevation: 5 },
  mainBtnText: { color: '#FFF', fontWeight: '800', letterSpacing: 1 },
  badge: { position: 'absolute', top: -5, right: -5, backgroundColor: '#FF4B4B', width: 18, height: 18, borderRadius: 9, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#FFF' },
  badgeText: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },
  listSection: { flex: 1, backgroundColor: '#FFF', borderTopLeftRadius: 40, borderTopRightRadius: 40, padding: 25, elevation: 10 },
  listTitle: { fontSize: 16, fontWeight: '800', marginBottom: 15, color: theme.colors.text1 },
  mateCard: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  mateInfo: { flex: 1, marginLeft: 15 },
  mateName: { fontSize: 15, fontWeight: '700', color: theme.colors.text1 },
  mateSubjectBadge: { backgroundColor: '#F3F4F6', paddingVertical: 2, paddingHorizontal: 6, borderRadius: 6, marginLeft: 8 },
  mateSubjectText: { fontSize: 10, fontWeight: '600', color: theme.colors.text2 },
  mateSub: { fontSize: 12, color: theme.colors.text2, marginTop: 2 },
  mateStatus: { alignItems: 'flex-end' },
  mateTime: { fontSize: 14, fontWeight: 'bold' },
  mateStatusText: { fontSize: 10, color: '#AAA' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#F7F9F5', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 30 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 22, fontWeight: '800', color: theme.colors.text1 },
  settingItem: { marginBottom: 25 },
  inputLabel: { fontSize: 14, fontWeight: '700', color: theme.colors.text1, marginBottom: 10 },
  textInput: { backgroundColor: '#FFF', padding: 15, borderRadius: 15, fontSize: 16, color: theme.colors.text1, elevation: 1 },
  stepper: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  stepBtn: { width: 45, height: 45, backgroundColor: '#FFF', borderRadius: 22, justifyContent: 'center', alignItems: 'center', elevation: 2 },
  stepVal: { marginHorizontal: 20 },
  stepValText: { fontSize: 18, fontWeight: 'bold', color: theme.colors.text1 },
  confirmBtn: { backgroundColor: theme.colors.primary, padding: 18, borderRadius: 20, alignItems: 'center', marginTop: 10, elevation: 3 },
  msgRow: { flexDirection: 'row', marginBottom: 10 },
  msgBox: { padding: 12, borderRadius: 15, maxWidth: '80%', elevation: 1 },
  quickInput: { borderTopWidth: 1, borderColor: '#EEE', paddingTop: 15 },
  quickPill: { paddingHorizontal: 15, paddingVertical: 8, backgroundColor: '#E5EDDF', borderRadius: 20, marginRight: 10 },
  quickPillText: { fontWeight: '600', color: theme.colors.text1 },
  soundRow: { flexDirection: 'row', alignItems: 'center', padding: 18, borderRadius: 15, marginBottom: 10, backgroundColor: '#FFF' }
});