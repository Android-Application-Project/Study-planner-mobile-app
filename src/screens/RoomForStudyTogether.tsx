import { StyleSheet, Text, View, TouchableOpacity, Animated, Easing, FlatList, Image, Alert, Modal, Dimensions, ScrollView } from 'react-native'
import React, { useState, useMemo, useEffect, useRef } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation, useRoute } from '@react-navigation/native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { useTheme } from '../utils/ThemeProvider';
import { Theme } from '../utils/Themes'; 
import { doc, onSnapshot, updateDoc, arrayRemove, increment, collection, addDoc, query, where, getDoc, getDocs, serverTimestamp, orderBy, limit } from 'firebase/firestore';
import { db, auth } from '../../firebaseConfig';

const { width } = Dimensions.get('window');
const QUICK_PHRASES = ["I'm ready!", "Break time ☕", "5 more mins", "Focus! 🚀", "Great job! 👏", "BRB"];
const EMOJIS = ["👍", "🔥", "💯", "📚", "😴", "💡", "🧠", "✨"];
const AMBIENT_SOUNDS = [
  { id: 'none', name: 'Silent', icon: 'volume-x', file: null },
  { id: 'rain', name: 'Rain', icon: 'cloud-rain', file: require('../assets/sounds/rain.mp3') },
  { id: 'waves', name: 'Waves', icon: 'wind', file: null },
  { id: 'cafe', name: 'Cafe', icon: 'coffee', file: require('../assets/sounds/cafe.mp3') },
];

const ProfileAvatar = ({ avatar, size, bgColor }: { avatar: string, size: number, bgColor: string }) => {
  const radius = size / 2;
  return (
    <View style={{ width: size, height: size, borderRadius: radius, backgroundColor: bgColor, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
      {avatar && avatar.startsWith('http') ? (
        <Image source={{ uri: avatar }} style={{ width: size, height: size }} />
      ) : (
        <Text style={{ fontSize: size * 0.5, color: '#555' }}>{avatar || '👤'}</Text>
      )}
    </View>
  );
};

export default function RoomForStudyTogether() {
  const navigation = useNavigation<any>()
  const route = useRoute<any>()
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { roomId, roomName, subject, icon, focusTime: initialFocus, breakTime: initialBreak, sessions: initialSessions } = route.params || {};
  const currentUserId = auth.currentUser?.uid;

  const [activeUsers, setActiveUsers] = useState<any[]>([]);
  const maxMembers = 4;
  const [focusMinutes] = useState(initialFocus || 25); 
  const [breakMinutes] = useState(initialBreak || 5);
  const [totalSessions, setTotalSessions] = useState(initialSessions || 4);
  const [currentSession, setCurrentSession] = useState(1);
  const [timeLeft, setTimeLeft] = useState(focusMinutes * 60); 
  const [isActive, setIsActive] = useState(false);
  const [isBreak, setIsBreak] = useState(false); 
  const animatedTimeLeft = useRef(new Animated.Value(timeLeft)).current;
  const [isInviteModalVisible, setInviteModalVisible] = useState(false);
  const [friendsList, setFriendsList] = useState<any[]>([]);
  const [isChatModalVisible, setChatModalVisible] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const [isSoundModalVisible, setSoundModalVisible] = useState(false);
  const [selectedSoundId, setSelectedSoundId] = useState('none');
  const soundObject = useRef<Audio.Sound | null>(null);

  const isCurrentUserHost = useMemo(() => {
    return activeUsers.some(u => u.id === currentUserId && u.isHost);
  }, [activeUsers, currentUserId]);

  const rotateAnimation = animatedTimeLeft.interpolate({
    inputRange: [0, (isBreak ? breakMinutes : focusMinutes) * 60],
    outputRange: ['360deg', '0deg'],
  });

  useEffect(() => {
    Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
      staysActiveInBackground: true,
    });

    return () => {
      if (soundObject.current) {
        soundObject.current.unloadAsync();
        soundObject.current = null;
      }
    };
  }, []);

  const handleSoundSelect = async (soundItem: any) => {
    try {
      if (soundObject.current) {
        await soundObject.current.stopAsync();
        await soundObject.current.unloadAsync();
        soundObject.current = null;
      }
      setSelectedSoundId(soundItem.id);
      if (soundItem.id !== 'none' && soundItem.file) {
        const { sound } = await Audio.Sound.createAsync(
          soundItem.file,
          { shouldPlay: true, isLooping: true, volume: 0.5 }
        );
        soundObject.current = sound;
      }
    } catch (error) { console.log(error); }
  };

  const sendQuickMessage = async (text: string) => {
    if (!currentUserId || !roomId) return;
    const myUserObj = activeUsers.find(u => u.id === currentUserId);
    try {
      await addDoc(collection(db, 'rooms', roomId, 'messages'), {
        text, senderId: currentUserId, senderName: myUserObj?.name || 'Someone',
        senderAvatar: myUserObj?.avatar || '', createdAt: serverTimestamp()
      });
    } catch (error) { console.error(error); }
  };

  useEffect(() => {
    if (!roomId || !db) return;
    const roomRef = doc(db, 'rooms', roomId);
    const unsubscribe = onSnapshot(roomRef, (docSnap) => {
      if (docSnap.exists()) {
        const roomData = docSnap.data();
        setActiveUsers(roomData.activeUsers || []);
        setIsActive(roomData.timerIsActive || false);
        setIsBreak(roomData.isBreak || false);
        setCurrentSession(roomData.currentSession || 1);
        setTotalSessions(roomData.sessions || 4);
        if (roomData.timerIsActive && roomData.endTime) {
          const now = Date.now();
          const remaining = Math.max(0, Math.floor((roomData.endTime - now) / 1000));
          setTimeLeft(remaining);
        } else if (roomData.remainingTime !== undefined) {
          setTimeLeft(roomData.remainingTime);
        }
      }
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
        if (msg.senderId !== currentUserId && !isChatModalVisible) {
          setUnreadCount(prev => prev + 1);
        }
      }
    });
    const qAll = query(messagesRef, orderBy('createdAt', 'desc'), limit(30));
    const unsubscribeAll = onSnapshot(qAll, (snapshot) => {
      setMessages(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => { unsubscribeLatest(); unsubscribeAll(); };
  }, [roomId, isChatModalVisible]);

  useEffect(() => {
    if (!currentUserId || !isInviteModalVisible) return;
    const fetchFriends = async () => {
      try {
        const myRef = doc(db, 'users', currentUserId);
        const mySnap = await getDoc(myRef);
        if (mySnap.exists()) {
          const friendIds = mySnap.data().friendIds || [];
          if (friendIds.length > 0) {
            const usersRef = collection(db, 'users');
            const q = query(usersRef, where('__name__', 'in', friendIds.slice(0, 30)));
            const querySnapshot = await getDocs(q);
            setFriendsList(querySnapshot.docs.map(d => ({ id: d.id, ...d.data() })));
          } else { setFriendsList([]); }
        }
      } catch (error) { console.error(error); }
    };
    fetchFriends();
  }, [currentUserId, isInviteModalVisible]);

  const handleToggleTimer = async () => {
    if (!isCurrentUserHost) return; 
    const newIsActive = !isActive;
    const now = Date.now();
    try {
      const roomRef = doc(db, 'rooms', roomId);
      if (newIsActive) {
        const newEndTime = now + (timeLeft * 1000);
        await updateDoc(roomRef, { timerIsActive: true, endTime: newEndTime });
      } else {
        await updateDoc(roomRef, { timerIsActive: false, remainingTime: timeLeft });
      }
    } catch (error) { console.error(error); }
  }

  useEffect(() => {
    Animated.timing(animatedTimeLeft, {
      toValue: timeLeft,
      duration: isActive && timeLeft > 0 ? 1000 : 0,
      easing: Easing.linear,
      useNativeDriver: true,
    }).start();
  }, [timeLeft]);

  useEffect(() => {
    let interval: any = null; 
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => setTimeLeft(prev => prev - 1), 1000); 
    } else if (isActive && timeLeft === 0) {
      clearInterval(interval);
      if (isCurrentUserHost) {
        let nextIsBreak = !isBreak;
        let nextSession = currentSession;
        if (!nextIsBreak) nextSession += 1;
        if (nextSession > totalSessions && !nextIsBreak) {
          updateDoc(doc(db, 'rooms', roomId), { timerIsActive: false, isBreak: false, currentSession: 1, remainingTime: focusMinutes * 60 });
          Alert.alert("Amazing Job! 🎉", "Completed all sessions.");
        } else {
          const nextTimeSeconds = (nextIsBreak ? breakMinutes : focusMinutes) * 60;
          updateDoc(doc(db, 'rooms', roomId), { timerIsActive: false, isBreak: nextIsBreak, currentSession: nextSession, remainingTime: nextTimeSeconds });
        }
      }
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft]);

  const handleLeaveRoom = async () => {
    if (!currentUserId || !roomId) { 
      navigation.canGoBack() ? navigation.goBack() : navigation.popToTop();
      return; 
    }
    try {
      const myUserObj = activeUsers.find(u => u.id === currentUserId);
      if (myUserObj) {
        await updateDoc(doc(db, 'rooms', roomId), { members: increment(-1), activeUsers: arrayRemove(myUserObj) });
      }
      navigation.canGoBack() ? navigation.goBack() : navigation.popToTop();
    } catch (error) { navigation.goBack(); }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleLeaveRoom}><Feather name="arrow-left" size={24} color={theme.colors.text1} /></TouchableOpacity>
        <View style={styles.titleContainer}>
            <Text style={styles.roomTitleText}>{roomName}</Text>
            <View style={styles.subjectPill}><Text style={styles.roomIconText}>{icon}</Text><Text style={styles.subjectPillText}>{subject}</Text></View>
        </View>
        <TouchableOpacity style={styles.iconButton} onPress={() => setSoundModalVisible(true)}>
          <Feather name={selectedSoundId === 'none' ? "music" : AMBIENT_SOUNDS.find(s => s.id === selectedSoundId)?.icon as any} size={24} color={theme.colors.text1} />
        </TouchableOpacity>
      </View>
      
      <View style={styles.heroSection}>
        <View style={styles.sessionDotsWrapper}>
          {[...Array(totalSessions)].map((_, i) => (
            <View key={i} style={[styles.sessionDot, i + 1 < currentSession && styles.sessionDotCompleted, i + 1 === currentSession && styles.sessionDotCurrent]} />
          ))}
        </View>
        <View style={styles.timerContainer}>
          <View style={styles.timerAura}><Text style={styles.timeTextInside}>{formatTime(timeLeft)}</Text><Text style={styles.statusTextInside}>{isActive ? (isBreak ? 'RESTING' : 'FOCUSING') : 'PAUSED'}</Text></View>
          <Animated.View style={[styles.dotRotatorContainer, { transform: [{ rotate: rotateAnimation }] }]}><View style={styles.progressDot} /></Animated.View>
        </View>
        <TouchableOpacity style={[styles.feedButton, isActive && styles.feedButtonActive, !isCurrentUserHost && styles.feedButtonDisabled]} onPress={handleToggleTimer} disabled={!isCurrentUserHost}>
          <Text style={[styles.feedButtonText, isActive && styles.feedButtonTextActive, !isCurrentUserHost && styles.feedButtonTextDisabled]}>
            {isCurrentUserHost ? (isActive ? 'PAUSE' : (isBreak ? 'START REST' : 'START FOCUS')) : (isActive ? (isBreak ? 'RESTING...' : 'FOCUSING...') : 'WAITING FOR HOST')}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.membersSection}>
          <View style={styles.membersHeader}>
            <Text style={styles.membersTitle}>Buddies <Text style={styles.membersCount}>{activeUsers.length}/{maxMembers}</Text></Text>
            <View style={{flexDirection: 'row'}}>
              <TouchableOpacity style={styles.iconButtonCircular} onPress={() => { setChatModalVisible(true); setUnreadCount(0); }}>
                  <Feather name="message-circle" size={20} color={theme.colors.text1} />
                  {unreadCount > 0 && (
                    <View style={styles.badgeContainer}>
                      <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                    </View>
                  )}
              </TouchableOpacity>
              {isCurrentUserHost && <TouchableOpacity style={[styles.iconButtonCircular, {marginLeft: 10}]} onPress={() => setInviteModalVisible(true)}><Feather name="plus" size={20} color={theme.colors.text1} /></TouchableOpacity>}
            </View>
          </View>
          <View style={styles.horizontalListContainer}>
            <FlatList horizontal data={activeUsers} keyExtractor={(item, index) => item.id || index.toString()}
              renderItem={({item}) => (
                <View style={styles.memberCardHorizontal}>
                  <View style={styles.avatarWrapper}><ProfileAvatar size={60} avatar={item.avatar} bgColor='#F3F4F6' />{item.isHost && <View style={styles.hostBadgeMini}><Feather name="star" size={10} color="#FFF" /></View>}</View>
                  <Text style={styles.memberNameHorizontal} numberOfLines={1}>{item.name}</Text>
                  <View style={[styles.memberStatusPill, isActive && !isBreak && { backgroundColor: theme.colors.primary }, isActive && isBreak && { backgroundColor: '#F59E0B' }]}><Text style={[styles.memberStatusTextHorizontal, isActive && { color: '#FFF' }]}>{isActive ? (isBreak ? 'Rest' : 'Focus') : 'Ready'}</Text></View>
                </View>
              )}
              showsHorizontalScrollIndicator={false} contentContainerStyle={styles.membersListHorizontal}
            />
          </View>
      </View>

      <Modal animationType="fade" transparent visible={isSoundModalVisible} onRequestClose={() => setSoundModalVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setSoundModalVisible(false)}>
          <View style={[styles.modalContent, { height: 'auto', paddingBottom: 40 }]}>
            <View style={styles.modalHeader}><Text style={styles.modalTitle}>Ambient Sounds</Text></View>
            <View style={styles.soundGrid}>{AMBIENT_SOUNDS.map((s) => (
                <TouchableOpacity key={s.id} style={[styles.soundItem, selectedSoundId === s.id && styles.soundItemActive]} onPress={() => handleSoundSelect(s)}><Feather name={s.icon as any} size={24} color={selectedSoundId === s.id ? '#FFF' : theme.colors.text1} /><Text style={[styles.soundItemText, selectedSoundId === s.id && {color: '#FFF'}]}>{s.name}</Text></TouchableOpacity>
              ))}</View>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal animationType="slide" transparent visible={isInviteModalVisible} onRequestClose={() => setInviteModalVisible(false)}>
        <View style={styles.modalOverlay}><View style={styles.modalContent}>
            <View style={styles.modalHeader}><Text style={styles.modalTitle}>Invite Friends</Text><TouchableOpacity onPress={() => setInviteModalVisible(false)}><Feather name="x" size={22} color={theme.colors.text1} /></TouchableOpacity></View>
            <FlatList data={friendsList} keyExtractor={item => item.id} renderItem={({item}) => (
                <View style={styles.friendInviteCard}><ProfileAvatar size={48} avatar={item.avatar} bgColor='#F3F4F6' /><View style={styles.friendInviteInfo}><Text style={styles.friendInviteName}>{item.name || item.username}</Text></View>
                {activeUsers.some(u => u.id === item.id) ? <Text style={styles.inRoomText}>In Room</Text> : <TouchableOpacity style={styles.sendInviteBtn} onPress={async () => {
                  const myRef = doc(db, 'users', currentUserId!);
                  const mySnap = await getDoc(myRef);
                  const myName = mySnap.data()?.name || 'A friend';
                  await addDoc(collection(db, 'notifications'), { type: 'room_invite', senderId: currentUserId, senderName: myName, receiverId: item.id, roomId, roomName, status: 'unread', createdAt: serverTimestamp() });
                  Alert.alert('Sent!', `Invitation sent to ${item.name || item.username}`);
                }}><Text style={styles.sendInviteBtnText}>Invite</Text></TouchableOpacity>}
                </View>
              )} ListEmptyComponent={<View style={styles.emptyStateContainer}><Feather name="users" size={32} color={theme.colors.primary} /><Text style={styles.emptyStateText}>No friends to invite.</Text></View>}
            />
        </View></View>
      </Modal>

      <Modal animationType="slide" transparent visible={isChatModalVisible} onRequestClose={() => { setChatModalVisible(false); setUnreadCount(0); }}>
        <View style={styles.modalOverlay}><View style={[styles.modalContent, { height: '80%', paddingHorizontal: 0 }]}>
            <View style={[styles.modalHeader, { paddingHorizontal: 25 }]}><Text style={styles.modalTitle}>Room Chat</Text><TouchableOpacity onPress={() => { setChatModalVisible(false); setUnreadCount(0); }}><Feather name="x" size={22} color={theme.colors.text1} /></TouchableOpacity></View>
            <FlatList data={messages} keyExtractor={item => item.id} inverted contentContainerStyle={styles.chatListContainer} renderItem={({item}: any) => {
              const isMe = item.senderId === currentUserId;
              const isEmoji = EMOJIS.includes(item.text);
              return (
                <View style={[styles.messageRow, isMe ? styles.messageRowMe : styles.messageRowOther]}>
                  {!isMe && <View style={{marginRight: 8}}><ProfileAvatar size={32} avatar={item.senderAvatar} bgColor='#E5EDDF' /></View>}
                  <View style={{ maxWidth: '75%' }}>
                    {!isMe && <Text style={styles.messageSenderName}>{item.senderName}</Text>}
                    <View style={[styles.messageBubble, isMe ? styles.messageBubbleMe : styles.messageBubbleOther, isEmoji && styles.messageBubbleEmoji]}>
                      <Text style={[styles.messageText, isMe ? styles.messageTextMe : styles.messageTextOther, isEmoji && styles.messageTextEmoji]}>{item.text}</Text>
                    </View>
                  </View>
                </View>
              );
            }} />
            <View style={styles.quickReplySection}><View style={styles.emojiRowWrapper}><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{paddingHorizontal: 20}}>
                {EMOJIS.map((e, i) => <TouchableOpacity key={i} style={styles.emojiBtn} onPress={() => sendQuickMessage(e)}><Text style={styles.emojiBtnText}>{e}</Text></TouchableOpacity>)}
            </ScrollView></View><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{paddingHorizontal: 20, paddingBottom: 20}}>
                {QUICK_PHRASES.map((p, i) => <TouchableOpacity key={i} style={styles.phraseBtn} onPress={() => sendQuickMessage(p)}><Text style={styles.phraseBtnText}>{p}</Text></TouchableOpacity>)}
            </ScrollView></View>
        </View></View>
      </Modal>
    </SafeAreaView>
  )
}

const createStyles = (theme: Theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: { width: '100%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 25, marginTop: 10, marginBottom: 10 },
  backButton: { padding: 12, backgroundColor: '#FFF', borderRadius: 24, elevation: 2 },
  titleContainer: { alignItems: 'center' },
  roomTitleText: { fontSize: 18, fontWeight: '800', color: theme.colors.text1, marginBottom: 4 },
  subjectPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.6)', paddingVertical: 4, paddingHorizontal: 10, borderRadius: 12 },
  roomIconText: { fontSize: 12, marginRight: 4 },
  subjectPillText: { fontSize: 12, fontWeight: '700', color: theme.colors.text2 },
  iconButton: { padding: 12 },
  heroSection: { alignItems: 'center', justifyContent: 'center', flex: 1, paddingTop: 10 },
  sessionDotsWrapper: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  sessionDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#D1D5DB', marginHorizontal: 4 },
  sessionDotCompleted: { backgroundColor: theme.colors.text2 },
  sessionDotCurrent: { width: 12, height: 12, borderRadius: 6, backgroundColor: theme.colors.primary },
  timerContainer: { position: 'relative', alignItems: 'center', justifyContent: 'center', marginBottom: 35 },
  timerAura: { width: 320, height: 320, borderRadius: 160, backgroundColor: 'rgba(255, 255, 255, 0.45)', justifyContent: 'center', alignItems: 'center' },
  timeTextInside: { fontSize: 88, fontWeight: '200', color: theme.colors.text1, letterSpacing: -3 },
  statusTextInside: { fontSize: 14, fontWeight: '700', color: theme.colors.primary, letterSpacing: 4 },
  dotRotatorContainer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'flex-start', alignItems: 'center' },
  progressDot: { width: 14, height: 14, borderRadius: 7, backgroundColor: theme.colors.primary, marginTop: -7 },
  feedButton: { backgroundColor: theme.colors.text1, paddingHorizontal: 50, paddingVertical: 20, borderRadius: 40, alignItems: 'center', elevation: 8 },
  feedButtonActive: { backgroundColor: '#FFFFFF' },
  feedButtonDisabled: { backgroundColor: '#E5E7EB' },
  feedButtonText: { fontSize: 16, color: '#FFF', fontWeight: '800', letterSpacing: 1.5 },
  feedButtonTextActive: { color: theme.colors.text1 },
  feedButtonTextDisabled: { color: theme.colors.text2 },
  membersSection: { height: 220, paddingTop: 10 },
  membersHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 30, marginBottom: 20 },
  membersTitle: { fontSize: 20, fontWeight: '800', color: theme.colors.text1 },
  membersCount: { fontSize: 16, fontWeight: '600', color: theme.colors.text2 },
  iconButtonCircular: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF', elevation: 2, position: 'relative' },
  badgeContainer: { position: 'absolute', top: -5, right: -5, backgroundColor: '#FF4B4B', width: 18, height: 18, borderRadius: 9, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#FFF' },
  badgeText: { color: '#FFF', fontSize: 9, fontWeight: 'bold' },
  horizontalListContainer: { paddingLeft: 30 },
  membersListHorizontal: { paddingRight: 60 },
  memberCardHorizontal: { alignItems: 'center', backgroundColor: '#FFFFFF', paddingVertical: 20, paddingHorizontal: 15, borderRadius: 30, marginRight: 15, width: 110, elevation: 2 },
  avatarWrapper: { position: 'relative', marginBottom: 12 },
  hostBadgeMini: { position: 'absolute', bottom: -2, right: -2, backgroundColor: '#F59E0B', width: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#FFF' },
  memberNameHorizontal: { fontSize: 15, fontWeight: '700', color: theme.colors.text1, marginBottom: 8 },
  memberStatusPill: { backgroundColor: '#F3F4F6', paddingVertical: 4, paddingHorizontal: 12, borderRadius: 12 },
  memberStatusTextHorizontal: { fontSize: 11, fontWeight: '700', color: theme.colors.text2 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#F7F9F5', height: '65%', borderTopLeftRadius: 40, borderTopRightRadius: 40, paddingHorizontal: 30, paddingTop: 35 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 },
  modalTitle: { fontSize: 24, fontWeight: '800', color: theme.colors.text1 },
  soundGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  soundItem: { width: '47%', backgroundColor: '#FFF', padding: 20, borderRadius: 25, alignItems: 'center', marginBottom: 15, elevation: 1 },
  soundItemActive: { backgroundColor: theme.colors.primary },
  soundItemText: { marginTop: 10, fontWeight: '700', color: theme.colors.text1 },
  closeModalBtn: { backgroundColor: '#E5EDDF', padding: 10, borderRadius: 20 },
  friendInviteCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', padding: 18, borderRadius: 24, marginBottom: 12 },
  friendInviteInfo: { flex: 1, marginLeft: 16 },
  friendInviteName: { fontSize: 17, fontWeight: '700', color: theme.colors.text1 },
  sendInviteBtn: { backgroundColor: theme.colors.primary, paddingVertical: 10, paddingHorizontal: 22, borderRadius: 20 },
  sendInviteBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },
  inRoomText: { color: theme.colors.text2, fontSize: 14, fontWeight: '600', marginRight: 10 },
  emptyStateContainer: { alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  emptyStateText: { color: theme.colors.text1, fontSize: 18, fontWeight: '600' },
  chatListContainer: { paddingHorizontal: 25, paddingTop: 20 },
  messageRow: { flexDirection: 'row', marginBottom: 15, alignItems: 'flex-end' },
  messageRowMe: { justifyContent: 'flex-end' },
  messageRowOther: { justifyContent: 'flex-start' },
  messageSenderName: { fontSize: 11, color: theme.colors.text2, marginBottom: 4, marginLeft: 4 },
  messageBubble: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 20 },
  messageBubbleMe: { backgroundColor: theme.colors.primary, borderBottomRightRadius: 4 },
  messageBubbleOther: { backgroundColor: '#FFFFFF', borderBottomLeftRadius: 4, elevation: 1 },
  messageBubbleEmoji: { backgroundColor: 'transparent', elevation: 0 },
  messageText: { fontSize: 15, fontWeight: '500' },
  messageTextMe: { color: '#FFFFFF' },
  messageTextOther: { color: theme.colors.text1 },
  messageTextEmoji: { fontSize: 40 },
  quickReplySection: { backgroundColor: '#FFFFFF', paddingTop: 15, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  emojiRowWrapper: { marginBottom: 15 },
  emojiBtn: { backgroundColor: '#F7F9F5', width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  emojiBtnText: { fontSize: 22 },
  phraseBtn: { backgroundColor: '#E5EDDF', paddingVertical: 10, paddingHorizontal: 18, borderRadius: 20, marginRight: 12 },
  phraseBtnText: { color: theme.colors.text1, fontSize: 14, fontWeight: '600' }
});