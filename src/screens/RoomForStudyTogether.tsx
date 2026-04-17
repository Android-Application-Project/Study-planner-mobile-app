import { StyleSheet, Text, View, TouchableOpacity, Animated, Easing, FlatList, Image, Alert, Modal, Dimensions, ScrollView, TextInput, PanResponder, Pressable } from 'react-native'
import React, { useState, useMemo, useEffect, useRef } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation, useRoute } from '@react-navigation/native';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import Svg, { Circle, G } from 'react-native-svg';
import { doc, onSnapshot, updateDoc, query, collection, orderBy, limit, getDoc, serverTimestamp, addDoc } from 'firebase/firestore';
import { db, auth } from '../../firebaseConfig';
import { useTheme } from '../utils/ThemeProvider';
import { Theme } from '../utils/Themes'; 

const { width } = Dimensions.get('window');

const CIRCLE_SIZE = 220; 
const CIRCLE_RADIUS = CIRCLE_SIZE / 2;
const RING_CENTER_R = 90; 
const RING_WIDTH = 22; 
const HANDLE_SIZE = 24;
const MIN_MINUTES = 0; 
const MAX_MINUTES = 120;
const STEP_MINUTES = 5;

const AMBIENT_SOUNDS = [
  { id: 'none', name: 'None', icon: 'volume-off' },
  { id: 'rain', name: 'Rain', icon: 'weather-pouring', file: require('../assets/sounds/rain.mp3') },
  { id: 'cafe', name: 'Cafe', icon: 'coffee', file: require('../assets/sounds/cafe.mp3') },
  { id: 'forest', name: 'Forest', icon: 'tree', file: require('../assets/sounds/forest.mp3')  },
];

const ProfileAvatar = ({ avatar, size, bgColor }: { avatar: string, size: number, bgColor: string }) => {
  return (
    <View style={{ width: size, height: size, borderRadius: size/2, backgroundColor: bgColor, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
      {avatar && avatar.startsWith('http') ? <Image source={{ uri: avatar }} style={{ width: size, height: size }} /> : <Text style={{ fontSize: size * 0.4 }}>{avatar || '👤'}</Text>}
    </View>
  );
};

const minutesToAngle = (m: number) => ((m - MIN_MINUTES) / (MAX_MINUTES - MIN_MINUTES)) * 360;
const polarToXY = (angle: number, radius: number) => {
  const rad = (angle - 90) * (Math.PI / 180);
  return { x: CIRCLE_RADIUS + radius * Math.cos(rad), y: CIRCLE_RADIUS + radius * Math.sin(rad) };
};
const pageToAngle = (px: number, py: number, cx: number, cy: number) => {
  let a = Math.atan2(px - cx, -(py - cy)) * (180 / Math.PI);
  return a < 0 ? a + 360 : a;
};

export default function RoomForIndependentStudy() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { roomId, roomName } = route.params || {};
  const currentUserId = auth.currentUser?.uid;

  const [activeUsers, setActiveUsers] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const [focusMinutes, setFocusMinutes] = useState(25);
  const [breakMinutes, setBreakMinutes] = useState(5);
  const [totalSessions, setTotalSessions] = useState(4);
  const [currentSession, setCurrentSession] = useState(1);
  const [subject, setSubject] = useState('Studying...');

  const [timeLeft, setTimeLeft] = useState(focusMinutes * 60); 
  const [isActive, setIsActive] = useState(false);
  const [isBreak, setIsBreak] = useState(false); 

  const [isChatModalVisible, setChatModalVisible] = useState(false);
  const [isSoundModalVisible, setSoundModalVisible] = useState(false);
  const [isSettingsModalVisible, setSettingsModalVisible] = useState(false);

  const [selectedSoundId, setSelectedSoundId] = useState('none');
  const soundObject = useRef<Audio.Sound | null>(null);

  const timerViewRef = useRef<View>(null);
  const circleCenterRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (!roomId) return;
    const roomUnsub = onSnapshot(doc(db, 'rooms', roomId), (snap) => {
      if (snap.exists()) setActiveUsers(snap.data().activeUsers || []);
    });
    return () => roomUnsub();
  }, [roomId]);

  const syncMyStatus = async () => {
    if (!currentUserId || !roomId) return;
    const roomRef = doc(db, 'rooms', roomId);
    const roomSnap = await getDoc(roomRef);
    if (roomSnap.exists()) {
      const users = roomSnap.data().activeUsers || [];
      const updatedUsers = users.map((u: any) => u.id === currentUserId ? { ...u, subject, status: isActive ? (isBreak ? 'Resting' : 'Focusing') : 'Paused', timeLeft, currentSession, totalSessions } : u);
      await updateDoc(roomRef, { activeUsers: updatedUsers });
    }
  };

  useEffect(() => { syncMyStatus(); }, [isActive, isBreak]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: (evt) => {
        if (isActive) return false;
        const { pageX, pageY } = evt.nativeEvent;
        const { x: cx, y: cy } = circleCenterRef.current;
        const d = Math.hypot(pageX - cx, pageY - cy);
        return d > 60 && d < 130; 
      },
      onPanResponderMove: (evt) => {
        const { pageX, pageY } = evt.nativeEvent;
        const { x: cx, y: cy } = circleCenterRef.current;
        let angle = pageToAngle(pageX, pageY, cx, cy);
        let rawMin = (angle / 360) * MAX_MINUTES;
        const snapped = Math.round(rawMin / 5) * 5;
        setFocusMinutes(snapped);
        if (!isBreak) setTimeLeft(snapped * 60);
      },
      onPanResponderRelease: syncMyStatus
    })
  ).current;

  useEffect(() => {
    let iv: any = null;
    if (isActive && timeLeft > 0) {
      iv = setInterval(() => setTimeLeft(t => t - 1), 1000);
    } else if (isActive && timeLeft === 0) {
      let nextIsBreak = !isBreak;
      let nextSession = isBreak ? currentSession + 1 : currentSession;
      if (nextSession > totalSessions && !nextIsBreak) {
        setIsActive(false); setIsBreak(false); setTimeLeft(focusMinutes * 60); setCurrentSession(1);
        Alert.alert("Awesome! Room complete!");
      } else {
        setIsBreak(nextIsBreak); setCurrentSession(nextSession);
        setTimeLeft((nextIsBreak ? breakMinutes : focusMinutes) * 60);
        setIsActive(false);
      }
      syncMyStatus();
    }
    return () => clearInterval(iv);
  }, [isActive, timeLeft]);

  useEffect(() => {
    Audio.setAudioModeAsync({ allowsRecordingIOS: false, playsInSilentModeIOS: true, staysActiveInBackground: true });
    return () => { if (soundObject.current) soundObject.current.unloadAsync(); };
  }, []);

  const handleSoundSelect = async (soundId: string) => {
    if (soundObject.current) { await soundObject.current.unloadAsync(); soundObject.current = null; }
    setSelectedSoundId(soundId);
    const selected = AMBIENT_SOUNDS.find(s => s.id === soundId);
    if (soundId !== 'none' && selected?.file) {
      const { sound } = await Audio.Sound.createAsync(selected.file, { shouldPlay: true, isLooping: true, volume: 0.5 });
      soundObject.current = sound;
    }
  };

  const measureCenter = () => timerViewRef.current?.measure((_fx, _fy, w, h, px, py) => {
    circleCenterRef.current = { x: px + w / 2, y: py + h / 2 };
  });

  const formatTime = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  const circumference = 2 * Math.PI * RING_CENTER_R;
  const currentDisplayMinutes = isActive ? (timeLeft / 60) : focusMinutes;
  const progressRatio = currentDisplayMinutes / MAX_MINUTES;
  const strokeDashoffset = circumference * (1 - progressRatio);
  const handleAngle = minutesToAngle(focusMinutes);
  const handlePos = polarToXY(handleAngle, RING_CENTER_R);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={24} color={theme.colors.text1} />
        </TouchableOpacity>
        
        <Text style={styles.roomHeaderTitle} numberOfLines={1}>{roomName}</Text>
        
        <TouchableOpacity style={styles.headerIcon} onPress={() => setSoundModalVisible(true)}>
          <MaterialCommunityIcons 
            name={selectedSoundId === 'none' ? "music-note-off" : "music-note"} 
            size={22} 
            color={theme.colors.primary} 
          />
        </TouchableOpacity>
      </View>

      <View style={styles.timerSection}>
        <View ref={timerViewRef} onLayout={measureCenter} style={styles.timerContainer} {...panResponder.panHandlers}>
          <Svg width={CIRCLE_SIZE} height={CIRCLE_SIZE}>
            <G rotation="-90" origin={`${CIRCLE_RADIUS}, ${CIRCLE_RADIUS}`}>
              <Circle cx={CIRCLE_RADIUS} cy={CIRCLE_RADIUS} r={RING_CENTER_R} stroke={theme.dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)"} strokeWidth={RING_WIDTH * 0.8} fill="none" />
              <Circle cx={CIRCLE_RADIUS} cy={CIRCLE_RADIUS} r={RING_CENTER_R} stroke={theme.colors.primary} strokeWidth={RING_WIDTH} fill="none" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} strokeLinecap="round" />
            </G>
          </Svg>
          <View style={styles.timerInner} pointerEvents="none">
            <Text style={styles.timeTextSmall}>{formatTime(timeLeft)}</Text>
            <Text style={styles.statusText}>{isBreak ? 'RELAX' : 'FOCUS'}</Text>
          </View>
          {!isActive && <View style={[styles.sliderHandle, { left: handlePos.x - HANDLE_SIZE / 2, top: handlePos.y - HANDLE_SIZE / 2 }]} />}
        </View>

        <View style={styles.controlRow}>
          <TouchableOpacity style={styles.summaryBadge} onPress={() => setSettingsModalVisible(true)}>
            <Text style={styles.summaryText}>{breakMinutes}m Rest • Round {currentSession}/{totalSessions}</Text>
            <Feather name="edit-3" size={12} color={theme.colors.text2} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.playButton} onPress={() => setIsActive(!isActive)}>
             <Ionicons name={isActive ? "pause" : "play"} size={24} color="#FFF" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.membersSection}>
        <View style={styles.membersHeader}>
          <Text style={styles.membersTitle}>Buddies ({activeUsers.length})</Text>
          <TouchableOpacity style={styles.chatBtn} onPress={() => setChatModalVisible(true)}>
            <Feather name="message-circle" size={20} color={theme.colors.text1} />
          </TouchableOpacity>
        </View>
        <FlatList 
          data={activeUsers} 
          keyExtractor={item => item.id} 
          renderItem={({item}) => (
            <View style={styles.mateCard}>
              <ProfileAvatar avatar={item.avatar} size={40} bgColor="#F3F4F6" />
              <View style={styles.mateInfo}>
                <Text style={styles.mateName}>{item.name} {item.id === currentUserId && '(You)'}</Text>
                <Text style={styles.mateSub}>{item.status || 'Thinking...'}</Text>
              </View>
              <View style={styles.mateTimeBox}>
                <Text style={styles.mateTimeText}>{formatTime(item.timeLeft || 0)}</Text>
              </View>
            </View>
          )} 
        />
      </View>

      <Modal 
        visible={isSettingsModalVisible} 
        animationType="slide" 
        transparent={true}
        onRequestClose={() => setSettingsModalVisible(false)} 
      >
        <Pressable style={styles.modalOverlay} onPress={() => setSettingsModalVisible(false)}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Timer Settings</Text>

            <View style={styles.settingRow}>
              <View>
                <Text style={styles.label}>Focus Subject</Text>
                <Text style={styles.subLabel}>What are you working on?</Text>
              </View>
              <TextInput 
                style={styles.textInput} 
                value={subject} 
                onChangeText={setSubject}
                placeholder="e.g. Coding"
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.settingRow}>
              <View>
                <Text style={styles.label}>Total Sessions</Text>
                <Text style={styles.subLabel}>Target: {totalSessions} rounds</Text>
              </View>
              <View style={styles.stepper}>
                <TouchableOpacity 
                  style={styles.stepBtn} 
                  onPress={() => setTotalSessions(Math.max(1, totalSessions - 1))}
                >
                  <Feather name="minus" size={20} color={theme.colors.primary} />
                </TouchableOpacity>
                <Text style={styles.stepVal}>{totalSessions}</Text>
                <TouchableOpacity 
                  style={styles.stepBtn} 
                  onPress={() => setTotalSessions(totalSessions + 1)}
                >
                  <Feather name="plus" size={20} color={theme.colors.primary} />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity 
              style={styles.confirmBtn} 
              onPress={() => {
                setSettingsModalVisible(false);
                syncMyStatus();
              }}
            >
              <Text style={{color: '#FFF', fontWeight: 'bold', fontSize: 16}}>Save Settings</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal 
        visible={isSoundModalVisible} 
        animationType="fade" 
        transparent={true}
        onRequestClose={() => setSoundModalVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setSoundModalVisible(false)}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Ambient Sounds</Text>
            
            <View style={styles.soundGrid}>
              {AMBIENT_SOUNDS.map((s) => (
                <TouchableOpacity 
                  key={s.id} 
                  style={[styles.soundItem, selectedSoundId === s.id && styles.soundItemActive]}
                  onPress={() => handleSoundSelect(s.id)}
                >
                  <MaterialCommunityIcons 
                    name={s.icon as any} 
                    size={32} 
                    color={selectedSoundId === s.id ? '#FFF' : theme.colors.text1} 
                  />
                  <Text style={[styles.soundName, selectedSoundId === s.id && {color: '#FFF'}]}>
                    {s.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={styles.confirmBtn} onPress={() => setSoundModalVisible(false)}>
              <Text style={{color: '#FFF', fontWeight: 'bold'}}>Done</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 5, height: 60 },
  backBtn: { padding: 8, backgroundColor: theme.colors.card, borderRadius: 12 },
  roomHeaderTitle: { fontSize: 18, fontWeight: '800', flex: 1, textAlign: 'center', marginHorizontal: 10, color: theme.colors.text1 },
  headerIcon: { padding: 8, backgroundColor: theme.colors.card, borderRadius: 12 },

  timerSection: { alignItems: 'center', paddingVertical: 5 },
  timerContainer: { width: CIRCLE_SIZE, height: CIRCLE_SIZE, justifyContent: 'center', alignItems: 'center' },
  timerInner: { position: 'absolute', alignItems: 'center' },
  timeTextSmall: { fontSize: 42, fontWeight: '200', color: theme.colors.text1, fontVariant: ['tabular-nums'] },
  statusText: { fontSize: 10, fontWeight: '800', color: theme.colors.text2, letterSpacing: 2, marginTop: -5 },
  sliderHandle: { position: 'absolute', width: HANDLE_SIZE, height: HANDLE_SIZE, borderRadius: HANDLE_SIZE/2, backgroundColor: '#FFF', borderWidth: 4, borderColor: theme.colors.primary, elevation: 5, zIndex: 99 },
  
  controlRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10, width: '90%', justifyContent: 'space-between' },
  summaryBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 25, elevation: 2, flex: 1, marginRight: 15 },
  summaryText: { fontSize: 13, fontWeight: '700', color: theme.colors.text1, marginRight: 10 },
  playButton: { width: 50, height: 50, borderRadius: 25, backgroundColor: theme.colors.primary, justifyContent: 'center', alignItems: 'center', elevation: 4 },

  membersSection: { flex: 1, backgroundColor: '#FFF', borderTopLeftRadius: 35, borderTopRightRadius: 35, padding: 20, marginTop: 10, elevation: 15 },
  membersHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  membersTitle: { fontSize: 16, fontWeight: '800', color: theme.colors.text1 },
  chatBtn: { padding: 10, backgroundColor: '#F3F4F6', borderRadius: 12 },
  mateCard: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, backgroundColor: '#F9FAFB', padding: 12, borderRadius: 20 },
  mateInfo: { flex: 1, marginLeft: 12 },
  mateName: { fontSize: 14, fontWeight: '700', color: theme.colors.text1 },
  mateSub: { fontSize: 12, color: theme.colors.text2 },
  mateTimeBox: { backgroundColor: '#E5EDDF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  mateTimeText: { fontSize: 13, fontWeight: 'bold', color: theme.colors.primary },

  modalOverlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.5)', 
    justifyContent: 'flex-end'
  },

  modalContent: { 
    backgroundColor: '#F7F9F5',
    padding: 30, 
    borderTopLeftRadius: 35, 
    borderTopRightRadius: 35,
    minHeight: 400 
  },

  modalHandle: {
    width: 40,
    height: 5,
    backgroundColor: '#DDD',
    borderRadius: 5,
    alignSelf: 'center',
    marginBottom: 20
  },

  modalTitle: { 
    fontSize: 22, 
    fontWeight: 'bold', 
    marginBottom: 25, 
    textAlign: 'center', 
    color: theme.colors.text1 
  },

  settingRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 20, 
    backgroundColor: '#FFF', 
    padding: 15, 
    borderRadius: 20 
  },

  soundGrid: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    justifyContent: 'space-between', 
    marginBottom: 10 
  },

  soundItem: { 
    width: '48%', 
    backgroundColor: '#FFF', 
    padding: 20, 
    borderRadius: 20, 
    alignItems: 'center', 
    marginBottom: 15, 
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2
  },

  soundItemActive: { 
    backgroundColor: theme.colors.primary 
  },

  soundName: { 
    marginTop: 10, 
    fontWeight: '600', 
    color: theme.colors.text1 
  },

  confirmBtn: { 
    backgroundColor: theme.colors.primary, 
    padding: 18, 
    borderRadius: 25, 
    alignItems: 'center', 
    marginTop: 10 
  },

  stepVal: { 
    fontSize: 16, 
    fontWeight: '800', 
    width: 55, 
    textAlign: 'center' 
  },

  label: { fontSize: 16, fontWeight: '700', color: theme.colors.text1 },
  subLabel: { fontSize: 12, color: '#999' },

  textInput: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 12,
    width: 120,
    textAlign: 'right',
    color: theme.colors.text1,
    fontWeight: '600'
  },
  stepper: { 
    flexDirection: 'row', 
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 15,
    padding: 5
  },
  stepBtn: { 
    width: 35, 
    height: 35, 
    justifyContent: 'center', 
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 10,
    elevation: 1
  },
});