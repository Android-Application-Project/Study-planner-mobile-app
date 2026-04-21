import { 
  StyleSheet, Text, View, TouchableOpacity, FlatList, Dimensions, Image, 
  Alert, Modal, ScrollView, PanResponder, Pressable 
} from 'react-native'
import React, { useState, useMemo, useEffect, useRef } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation, useRoute } from '@react-navigation/native';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import Svg, { Circle, G } from 'react-native-svg';
import { doc, onSnapshot, updateDoc, getDoc, arrayUnion, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../../firebaseConfig';
import { useTheme } from '../utils/ThemeContext'
import { Theme } from '../utils/Themes'; 

const { width } = Dimensions.get('window');

const QUICK_MESSAGES = ["Fighting! 🔥", "Almost done 🚀", "Good Job Everyone 👏", "I'm back 🏠", "Keep Focusing 📖", "Hello", "Welcome to join us"];
const QUICK_EMOJIS = ["❤️", "🔥", "🙌", "✨", "💯", "✅", "💤"];
const CIRCLE_SIZE = 240; 
const CIRCLE_RADIUS = CIRCLE_SIZE / 2;
const RING_CENTER_R = 100; 
const RING_WIDTH = 24; 
const HANDLE_SIZE = 24;
const MAX_MINUTES = 120;

const PETS_DATA = {
  elephant: { stages: { baby: require('../assets/Animal/BabyElephant.png'), child: require('../assets/Animal/ChildElephant.png'), adult: require('../assets/Animal/AdultElephant.png'), crying: require('../assets/Animal/CryingElephant.png') } },
  crocodile: { stages: { baby: require('../assets/Animal/BabyCrocodile.png'), child: require('../assets/Animal/ChildCrocodile.png'), adult: require('../assets/Animal/AdultCrocodile.png'), crying: require('../assets/Animal/CryingCrocodile.png') } },
  shark: { stages: { baby: require('../assets/Animal/BabyShark.png'), child: require('../assets/Animal/KidShark.png'), adult: require('../assets/Animal/AdultShark.png'), crying: require('../assets/Animal/CryingShark.png') } }
};

const AMBIENT_SOUNDS = [
  { id: 'none', name: 'None', icon: 'volume-off' },
  { id: 'rain', name: 'Rain', icon: 'weather-pouring', file: require('../assets/sounds/rain.mp3') },
  { id: 'cafe', name: 'Cafe', icon: 'coffee', file: require('../assets/sounds/cafe.mp3') },
  { id: 'forest', name: 'Forest', icon: 'tree', file: require('../assets/sounds/forest.mp3')  },
];

const ProfileAvatar = ({ avatar, size, bgColor }: { avatar: string, size: number, bgColor: string }) => (
  <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: bgColor, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
    {avatar && avatar.startsWith('http') ? <Image source={{ uri: avatar }} style={{ width: size, height: size }} /> : <Text style={{ fontSize: size * 0.4 }}>{avatar || '👤'}</Text>}
  </View>
);

export default function RoomForIndependentStudy() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { roomId, roomName } = route.params || {};
  const currentUserId = auth.currentUser?.uid;

  const [activeUsers, setActiveUsers] = useState<any[]>([]);
  const [roomMessages, setRoomMessages] = useState<any[]>([]);
  const [friends, setFriends] = useState<any[]>([]);
  const [focusMinutes, setFocusMinutes] = useState(25);
  const [breakMinutes, setBreakMinutes] = useState(5);
  const [totalSessions, setTotalSessions] = useState(4);
  const [currentSession, setCurrentSession] = useState(1);
  const [timeLeft, setTimeLeft] = useState(25 * 60); 
  const [isActive, setIsActive] = useState(false);
  const [isBreak, setIsBreak] = useState(false); 
  const [selectedPetId, setSelectedPetId] = useState('elephant');
  const [showCryingPet, setShowCryingPet] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const [selectedSoundId, setSelectedSoundId] = useState('none');

  const [isChatModalVisible, setChatModalVisible] = useState(false);
  const [isInviteModalVisible, setInviteModalVisible] = useState(false);
  const [isSoundModalVisible, setSoundModalVisible] = useState(false);
  const [isSettingsModalVisible, setSettingsModalVisible] = useState(false);

  const soundObject = useRef<Audio.Sound | null>(null);
  const timerViewRef = useRef<View>(null);
  const circleCenterRef = useRef({ x: 0, y: 0 });

  const handleExitRoom = async () => {
    if (!roomId || !currentUserId) return;
    const roomRef = doc(db, 'rooms', roomId);
    const roomSnap = await getDoc(roomRef);
    if (roomSnap.exists()) {
      const data = roomSnap.data();
      const updatedUsers = (data.activeUsers || []).filter((u: any) => u.id !== currentUserId);
      await updateDoc(roomRef, {
        activeUsers: updatedUsers,
        members: updatedUsers.length
      });
    }
  };

  useEffect(() => {
    if (!roomId || !currentUserId) return;
    const roomRef = doc(db, 'rooms', roomId);
    const unsubRoom = onSnapshot(roomRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setActiveUsers(data.activeUsers || []);
        const newMsgs = data.messages || [];
        if (!isChatModalVisible && newMsgs.length > roomMessages.length) {
          if (newMsgs[newMsgs.length - 1].senderId !== currentUserId) setHasUnread(true);
        }
        setRoomMessages(newMsgs);
      }
    });
    onSnapshot(doc(db, 'users', currentUserId), async (snap) => {
      if (snap.exists()) {
        const userData = snap.data();
        setSelectedPetId(userData.selectedPetId || 'elephant');
        const fList = [];
        for (const fid of (userData.friendIds || [])) {
          const fSnap = await getDoc(doc(db, 'users', fid));
          if (fSnap.exists()) fList.push({ id: fSnap.id, ...fSnap.data() });
        }
        setFriends(fList);
      }
    });
    return () => unsubRoom();
  }, [roomId, currentUserId, isChatModalVisible, roomMessages.length]);

  useEffect(() => {
    const unsubNav = navigation.addListener('beforeRemove', (e: any) => {
      if (!isActive) { handleExitRoom(); return; }
      e.preventDefault();
      Alert.alert("Abandon your pet?", "Leaving now will reset progress.", [
        { text: "Stay", style: "cancel" },
        { text: "Leave", style: 'destructive', onPress: () => { handleExitRoom(); navigation.dispatch(e.data.action); } }
      ]);
    });
    return () => { 
      unsubNav();
      handleExitRoom(); 
    };
  }, [navigation, isActive, roomId, currentUserId]);

  const playAmbientSound = async (soundId: string) => {
    try {
      if (soundObject.current) { await soundObject.current.stopAsync(); await soundObject.current.unloadAsync(); soundObject.current = null; }
      const soundInfo = AMBIENT_SOUNDS.find(s => s.id === soundId);
      if (!soundInfo || soundId === 'none') { setSelectedSoundId('none'); return; }
      const { sound } = await Audio.Sound.createAsync(soundInfo.file, { shouldPlay: true, isLooping: true, volume: 0.5 });
      soundObject.current = sound; setSelectedSoundId(soundId);
    } catch (e) { console.log(e); }
  };

  const sendQuickMessage = async (content: string) => {
    if (!currentUserId || !roomId) return;
    const newMessage = { senderId: currentUserId, senderName: activeUsers.find((u: any) => u.id === currentUserId)?.name || 'Buddy', content, timestamp: Date.now() };
    try { await updateDoc(doc(db, 'rooms', roomId), { messages: arrayUnion(newMessage) }); } catch (e) { console.log(e); }
  };

  const sendInvite = async (fId: string, fName: string) => {
    try {
      await addDoc(collection(db, 'notifications'), { receiverId: fId, senderId: currentUserId, senderName: activeUsers.find((u: any) => u.id === currentUserId)?.name || 'Buddy', roomId, roomName, status: 'unread', type: 'invite', createdAt: serverTimestamp() });
      Alert.alert("Success", `Invite sent to ${fName}!`);
    } catch (e) { console.log(e); }
  };

  const syncMyStatus = async () => {
    if (!currentUserId || !roomId) return;
    const roomRef = doc(db, 'rooms', roomId);
    const snap = await getDoc(roomRef);
    if (snap.exists()) {
      const users = snap.data().activeUsers || [];
      const updated = users.map((u: any) => u.id === currentUserId ? { ...u, status: isActive ? (isBreak ? 'Resting' : 'Focusing') : 'Pause', timeLeft } : u);
      await updateDoc(roomRef, { activeUsers: updated });
    }
  };

  useEffect(() => { syncMyStatus(); }, [isActive, isBreak, timeLeft]);

  useEffect(() => {
    let iv: any = null;
    if (isActive && timeLeft > 0) iv = setInterval(() => setTimeLeft(t => t - 1), 1000);
    else if (isActive && timeLeft === 0) {
      if (!isBreak) {
        if (currentSession < totalSessions) { setIsBreak(true); setTimeLeft(breakMinutes * 60); }
        else { setIsActive(false); setTimeLeft(focusMinutes * 60); setCurrentSession(1); Alert.alert("Congratulations!"); }
      } else { setCurrentSession(s => s + 1); setIsBreak(false); setTimeLeft(focusMinutes * 60); }
    }
    return () => clearInterval(iv);
  }, [isActive, timeLeft, isBreak]);

  const getCurrentPetImage = () => {
    const pet = (PETS_DATA as any)[selectedPetId] || PETS_DATA.elephant;
    if (showCryingPet) return pet.stages.crying;
    const progress = (timeLeft / ((isBreak ? breakMinutes : focusMinutes) * 60)) * 100;
    if (progress > 70) return pet.stages.baby;
    if (progress <= 20) return pet.stages.adult;
    return pet.stages.child;
  };

  const circumference = 2 * Math.PI * RING_CENTER_R;
  const progressRatio = (isActive ? (timeLeft / 60) : focusMinutes) / MAX_MINUTES;
  const strokeDashoffset = circumference * (1 - progressRatio);
  const rad = (((focusMinutes / MAX_MINUTES) * 360) - 90) * (Math.PI / 180);
  const handleX = CIRCLE_RADIUS + RING_CENTER_R * Math.cos(rad);
  const handleY = CIRCLE_RADIUS + RING_CENTER_R * Math.sin(rad);

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => !isActive,
    onMoveShouldSetPanResponder: () => !isActive,
    onPanResponderMove: (evt) => {
      const { pageX, pageY } = evt.nativeEvent;
      const { x: cx, y: cy } = circleCenterRef.current;
      let angle = Math.atan2(pageX - cx, -(pageY - cy)) * (180 / Math.PI);
      if (angle < 0) angle += 360;
      let snapped = Math.round((angle / 360) * MAX_MINUTES / 5) * 5;
      setFocusMinutes(snapped); if (!isBreak) setTimeLeft(snapped * 60);
    },
  }), [isActive]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}><Feather name="arrow-left" size={24} color={theme.colors.text1} /></TouchableOpacity>
        <Text style={styles.roomHeaderTitle}>{roomName}</Text>
        <TouchableOpacity style={styles.headerIcon} onPress={() => setSoundModalVisible(true)}><MaterialCommunityIcons name="music" size={22} color={theme.colors.primary} /></TouchableOpacity>
      </View>

      <View style={styles.timerSection}>
        <View ref={timerViewRef} onLayout={() => timerViewRef.current?.measure((_fx, _fy, w, h, px, py) => { circleCenterRef.current = { x: px + w / 2, y: py + h / 2 }; })} style={styles.timerContainer} {...panResponder.panHandlers}>
          <Svg width={CIRCLE_SIZE} height={CIRCLE_SIZE}>
            <G rotation="-90" origin={`${CIRCLE_RADIUS}, ${CIRCLE_RADIUS}`}>
              <Circle cx={CIRCLE_RADIUS} cy={CIRCLE_RADIUS} r={RING_CENTER_R} stroke="rgba(0,0,0,0.05)" strokeWidth={RING_WIDTH} fill="none" />
              <Circle cx={CIRCLE_RADIUS} cy={CIRCLE_RADIUS} r={RING_CENTER_R} stroke={theme.colors.primary} strokeWidth={RING_WIDTH} fill="none" strokeDasharray={circumference} strokeDashoffset={circumference * (1 - progressRatio)} strokeLinecap="round" />
            </G>
          </Svg>
          <View style={styles.timerInner} pointerEvents="none">
            <Image source={getCurrentPetImage()} style={{ width: 100, height: 100 }} resizeMode="contain" />
            <Text style={styles.timeTextSmall}>{formatTime(timeLeft)}</Text>
          </View>
          {!isActive && <View style={[styles.sliderHandle, { left: handleX - HANDLE_SIZE / 2, top: handleY - HANDLE_SIZE / 2 }]} />}
        </View>

        <View style={styles.controlRow}>
          <TouchableOpacity style={styles.summaryBadge} onPress={() => setSettingsModalVisible(true)} disabled={isActive}>
            <Text style={styles.summaryText}>{breakMinutes}m Rest • {currentSession}/{totalSessions} Round</Text>
            {!isActive && <Feather name="edit-3" size={12} color={theme.colors.text2} />}
          </TouchableOpacity>
          <TouchableOpacity style={styles.playButton} onPress={() => {
            if (isActive) {
              Alert.alert("Give up? 😭", "Progress will reset!", [
                { text: "Stay", style: "cancel" },
                { text: "Quit", style: "destructive", onPress: () => {
                  setIsActive(false); setIsBreak(false); setCurrentSession(1); setTimeLeft(focusMinutes * 60);
                  setShowCryingPet(true); setTimeout(() => setShowCryingPet(false), 4000); syncMyStatus();
                }}
              ]);
            } else { setIsActive(true); setShowCryingPet(false); }
          }}><Ionicons name={isActive ? "pause" : "play"} size={24} color="#FFF" /></TouchableOpacity>
        </View>
      </View>

      <View style={styles.membersSection}>
        <View style={styles.membersHeader}>
          <Text style={styles.membersTitle}>Roommates ({activeUsers.length})</Text>
          <View style={{ flexDirection: 'row' }}>
            <TouchableOpacity style={[styles.chatBtn, {marginRight: 8, backgroundColor: '#E0F2FE'}]} onPress={() => setInviteModalVisible(true)}><Feather name="user-plus" size={20} color="#0284c7" /></TouchableOpacity>
            <TouchableOpacity style={styles.chatBtn} onPress={() => { setChatModalVisible(true); setHasUnread(false); }}><Feather name="message-circle" size={20} color={theme.colors.text1} />{hasUnread && <View style={styles.unreadBadge} />}</TouchableOpacity>
          </View>
        </View>
        <FlatList data={activeUsers} keyExtractor={item => item.id} renderItem={({item}) => (
          <View style={styles.mateCard}>
            <ProfileAvatar avatar={item.avatar} size={40} bgColor="#F3F4F6" />
            <View style={[styles.mateInfo, {marginLeft: 12}]}><Text style={styles.mateName}>{item.name} {item.id === currentUserId && '(You)'}</Text><Text style={styles.mateSub}>{item.status}</Text></View>
            <View style={styles.mateTimeBox}><Text style={styles.mateTimeText}>{formatTime(item.timeLeft || 0)}</Text></View>
          </View>
        )} />
      </View>

      <Modal visible={isInviteModalVisible} animationType="slide" transparent>
        <Pressable style={styles.modalOverlay} onPress={() => setInviteModalVisible(false)}>
          <View style={[styles.modalContent, { height: '60%' }]}>
            <View style={styles.modalHandle} /><Text style={styles.modalTitle}>Invite Friends</Text>
            <FlatList data={friends} keyExtractor={item => item.id} renderItem={({item}) => (
              <View style={[styles.mateCard, {backgroundColor: '#F9FAFB'}]}>
                <ProfileAvatar avatar={item.avatar} size={40} bgColor="#EEE" />
                <Text style={[styles.mateName, {flex: 1, marginLeft: 12}]}>{item.name || item.username}</Text>
                <TouchableOpacity style={[styles.playButton, {width: 70, height: 35, borderRadius: 10}]} onPress={() => sendInvite(item.id, item.name || item.username)}><Text style={{color: '#FFF', fontWeight: 'bold', fontSize: 12}}>Invite</Text></TouchableOpacity>
              </View>
            )} ListEmptyComponent={<Text style={{textAlign: 'center', marginTop: 20, color: '#999'}}>No friends found.</Text>} />
          </View>
        </Pressable>
      </Modal>

      <Modal visible={isChatModalVisible} animationType="slide" transparent>
        <Pressable style={styles.modalOverlay} onPress={() => setChatModalVisible(false)}>
          <View style={[styles.modalContent, { height: '75%' }]}>
            <View style={styles.modalHandle} /><Text style={styles.modalTitle}>Quick Chat</Text>
            <ScrollView style={{ flex: 1, marginBottom: 15 }} showsVerticalScrollIndicator={false}>
              {roomMessages.map((msg, index) => (
                <View key={index} style={{ alignSelf: msg.senderId === currentUserId ? 'flex-end' : 'flex-start', backgroundColor: msg.senderId === currentUserId ? theme.colors.primary : '#EEE', padding: 12, borderRadius: 18, marginBottom: 8, maxWidth: '80%' }}>
                  <Text style={{ fontSize: 10, color: msg.senderId === currentUserId ? '#EEE' : '#666', marginBottom: 2 }}>{msg.senderName}</Text>
                  <Text style={{ color: msg.senderId === currentUserId ? '#FFF' : '#000', fontWeight: '600' }}>{msg.content}</Text>
                </View>
              ))}
            </ScrollView>
            <View style={styles.quickChatSection}>
              <View style={styles.emojiRow}>{QUICK_EMOJIS.map(emoji => (<TouchableOpacity key={emoji} onPress={() => sendQuickMessage(emoji)}><Text style={{ fontSize: 32 }}>{emoji}</Text></TouchableOpacity>))}</View>
              <View style={styles.textMsgGrid}>{QUICK_MESSAGES.map(msg => (<TouchableOpacity key={msg} style={styles.quickMsgBtn} onPress={() => sendQuickMessage(msg)}><Text style={styles.quickMsgText}>{msg}</Text></TouchableOpacity>))}</View>
            </View>
          </View>
        </Pressable>
      </Modal>

      <Modal visible={isSettingsModalVisible} animationType="slide" transparent>
        <Pressable style={styles.modalOverlay} onPress={() => setSettingsModalVisible(false)}>
          <View style={styles.modalContent}><View style={styles.modalHandle} /><Text style={styles.modalTitle}>Timer Config</Text>
            <View style={styles.settingRow}><View><Text style={styles.label}>Rest Time</Text><Text style={styles.subLabel}>Minutes</Text></View>
              <View style={styles.stepper}><TouchableOpacity onPress={() => setBreakMinutes(Math.max(1, breakMinutes - 1))}><Feather name="minus" size={20}/></TouchableOpacity><Text style={styles.stepVal}>{breakMinutes}m</Text><TouchableOpacity onPress={() => setBreakMinutes(breakMinutes + 1)}><Feather name="plus" size={20}/></TouchableOpacity></View>
            </View>
            <View style={styles.settingRow}><View><Text style={styles.label}>Total Rounds</Text><Text style={styles.subLabel}>Sessions</Text></View>
              <View style={styles.stepper}><TouchableOpacity onPress={() => setTotalSessions(Math.max(1, totalSessions - 1))}><Feather name="minus" size={20}/></TouchableOpacity><Text style={styles.stepVal}>{totalSessions}</Text><TouchableOpacity onPress={() => setTotalSessions(totalSessions + 1)}><Feather name="plus" size={20}/></TouchableOpacity></View>
            </View>
            <TouchableOpacity style={styles.confirmBtn} onPress={() => {setSettingsModalVisible(false); syncMyStatus();}}><Text style={{color: '#FFF', fontWeight: 'bold'}}>Done</Text></TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      <Modal visible={isSoundModalVisible} animationType="fade" transparent>
        <Pressable style={styles.modalOverlay} onPress={() => setSoundModalVisible(false)}>
          <View style={styles.modalContent}><View style={styles.modalHandle} /><Text style={styles.modalTitle}>Ambient Sounds</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
              {AMBIENT_SOUNDS.map((s) => (
                <TouchableOpacity key={s.id} style={{ width: '48%', backgroundColor: selectedSoundId === s.id ? theme.colors.primary : '#F3F4F6', padding: 15, borderRadius: 20, alignItems: 'center', marginBottom: 15, flexDirection: 'row', justifyContent: 'center' }} onPress={() => playAmbientSound(s.id)}>
                  <MaterialCommunityIcons name={s.icon as any} size={20} color={selectedSoundId === s.id ? '#FFF' : theme.colors.text2} style={{ marginRight: 8 }} />
                  <Text style={{ fontWeight: 'bold', color: selectedSoundId === s.id ? '#FFF' : theme.colors.text1 }}>{s.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={styles.confirmBtn} onPress={() => setSoundModalVisible(false)}><Text style={{ color: '#FFF', fontWeight: 'bold' }}>Close</Text></TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const formatTime = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

const createStyles = (theme: Theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, height: 60 },
  backBtn: { padding: 8, backgroundColor: theme.colors.card, borderRadius: 12 },
  roomHeaderTitle: { fontSize: 18, fontWeight: '800', color: theme.colors.text1 },
  headerIcon: { padding: 8, backgroundColor: theme.colors.card, borderRadius: 12 },
  timerSection: { alignItems: 'center', marginTop: 10 },
  timerContainer: { width: CIRCLE_SIZE, height: CIRCLE_SIZE, justifyContent: 'center', alignItems: 'center' },
  timerInner: { position: 'absolute', alignItems: 'center' },
  timeTextSmall: { fontSize: 26, fontWeight: 'bold', color: theme.colors.text1, marginTop: 5 },
  sliderHandle: { position: 'absolute', width: HANDLE_SIZE, height: HANDLE_SIZE, borderRadius: HANDLE_SIZE/2, backgroundColor: '#FFF', borderWidth: 4, borderColor: theme.colors.primary, elevation: 5 },
  controlRow: { flexDirection: 'row', alignItems: 'center', marginTop: 20, width: '90%', justifyContent: 'space-between' },
  summaryBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', padding: 12, borderRadius: 20, flex: 1, marginRight: 15, elevation: 2 },
  summaryText: { fontSize: 13, fontWeight: '700', color: theme.colors.text1, marginRight: 10 },
  playButton: { width: 50, height: 50, borderRadius: 25, backgroundColor: theme.colors.primary, justifyContent: 'center', alignItems: 'center' },
  membersSection: { flex: 1, backgroundColor: '#FFF', borderTopLeftRadius: 35, borderTopRightRadius: 35, padding: 20, marginTop: 20, elevation: 10 },
  membersHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  membersTitle: { fontSize: 16, fontWeight: '800', color: theme.colors.text1 },
  chatBtn: { padding: 10, backgroundColor: '#F3F4F6', borderRadius: 12, position: 'relative' },
  unreadBadge: { position: 'absolute', top: -2, right: -2, width: 10, height: 10, borderRadius: 5, backgroundColor: '#EF4444', borderWidth: 1.5, borderColor: '#FFF' },
  mateCard: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, backgroundColor: '#F9FAFB', padding: 12, borderRadius: 15 },
  mateInfo: { flex: 1 },
  mateName: { fontSize: 14, fontWeight: '700', color: theme.colors.text1 },
  mateSub: { fontSize: 12, color: theme.colors.text2 },
  mateTimeBox: { backgroundColor: '#E5EDDF', padding: 6, borderRadius: 10 },
  mateTimeText: { fontSize: 13, fontWeight: 'bold', color: theme.colors.primary },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFF', padding: 25, borderTopLeftRadius: 30, borderTopRightRadius: 30 },
  modalHandle: { width: 40, height: 5, backgroundColor: '#DDD', borderRadius: 5, alignSelf: 'center', marginBottom: 15 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 20, textAlign: 'center', color: theme.colors.text1 },
  quickChatSection: { borderTopWidth: 1, borderColor: '#EEE', paddingTop: 15 },
  emojiRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 20 },
  textMsgGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
  quickMsgBtn: { backgroundColor: '#F3F4F6', paddingHorizontal: 15, paddingVertical: 10, borderRadius: 20, margin: 5 },
  quickMsgText: { fontSize: 13, fontWeight: '600', color: theme.colors.text1 },
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, backgroundColor: '#FFF', padding: 15, borderRadius: 20 },
  label: { fontSize: 16, fontWeight: '700', color: theme.colors.text1 },
  subLabel: { fontSize: 12, color: '#999' },
  stepper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', padding: 5, borderRadius: 15 },
  stepVal: { fontSize: 16, fontWeight: '800', width: 55, textAlign: 'center' },
  confirmBtn: { backgroundColor: theme.colors.primary, padding: 15, borderRadius: 20, alignItems: 'center' },
});