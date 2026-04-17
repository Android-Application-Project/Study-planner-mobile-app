import {
  StyleSheet, Text, View, TouchableOpacity, Modal, Pressable, ScrollView, PanResponder, Alert, FlatList, Dimensions, Image 
} from 'react-native'
import React, { useState, useMemo, useEffect, useRef } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Feather, FontAwesome5, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons'
import DropDownPicker from 'react-native-dropdown-picker'
import Svg, { Circle, G } from 'react-native-svg'
import { Audio } from 'expo-av'
import { doc, updateDoc, onSnapshot, getDoc } from 'firebase/firestore'
import { db, auth } from '../../firebaseConfig'
import { useTheme } from '../utils/ThemeProvider'
import { Theme } from '../utils/Themes'

const { width } = Dimensions.get('window');

// --- 圓環與計時常量 ---
const CIRCLE_SIZE = 300;
const CIRCLE_RADIUS = CIRCLE_SIZE / 2;
const RING_CENTER_R = 125;
const RING_WIDTH = 28; 
const HANDLE_SIZE = 28;
const MAX_MINUTES = 120;
const STEP_MINUTES = 5;

// --- 寵物數據定義 (嚴格對應你的 PNG 檔名) ---
const PETS_DATA = {
  elephant: {
    name: 'Elephant',
    id: 'elephant',
    stages: {
      baby: require('../assets/Animal/BabyElephant.png'), 
      child: require('../assets/Animal/ChildElephant.png'),
      adult: require('../assets/Animal/AdultElephant.png'), 
      crying: require('../assets/Animal/CryingElephant.png')
    }
  },
  crocodile: {
    name: 'Crocodile',
    id: 'crocodile',
    stages: {
      baby: require('../assets/Animal/BabyCrocodile.png'),
      child: require('../assets/Animal/ChildCrocodile.png'),
      adult: require('../assets/Animal/AdultCrocodile.png'), 
      crying: require('../assets/Animal/CryingCrocodile.png')
    }
  },
  shark: {
    name: 'Shark',
    id: 'shark',
    stages: {
      baby: require('../assets/Animal/BabyShark.png'),
      child: require('../assets/Animal/KidShark.png'),
      adult: require('../assets/Animal/AdultShark.png'),
      crying: require('../assets/Animal/CryingShark.png')
    }
  }
};

const PETS_LIST = Object.values(PETS_DATA);

const AMBIENT_SOUNDS = [
  { id: 'none', name: 'None', icon: 'volume-off' },
  { id: 'rain', name: 'Rain', icon: 'weather-pouring', file: require('../assets/sounds/rain.mp3') },
  { id: 'cafe', name: 'Cafe', icon: 'coffee', file: require('../assets/sounds/cafe.mp3') },
  { id: 'forest', name: 'Forest', icon: 'tree', file: require('../assets/sounds/forest.mp3') },
];

export default function HomeScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const USER_ID = auth.currentUser?.uid;

  // --- 狀態控制 ---
  const [streak, setStreak] = useState(0);
  const [lastFocusDate, setLastFocusDate] = useState<string | null>(null);
  const [currentMode, setCurrentMode] = useState('Study');
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([
    { label: 'Study Mode', value: 'Study' },
    { label: 'Relax Mode', value: 'Relax' },
    { label: 'Deep Work', value: 'DeepWork' },
  ]);

  const [focusMinutes, setFocusMinutes] = useState(25);
  const [breakMinutes, setBreakMinutes] = useState(5);
  const [totalRounds, setTotalRounds] = useState(4);
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);
  const [isBreak, setIsBreak] = useState(false);
  const [currentRound, setCurrentRound] = useState(1);

  const [selectedPetId, setSelectedPetId] = useState('elephant'); 
  const [showCryingPet, setShowCryingPet] = useState(false); 
  
  const [isModalVisible, setModalVisible] = useState(false);
  const [isPetModalVisible, setPetModalVisible] = useState(false); 
  const [isSoundModalVisible, setSoundModalVisible] = useState(false);
  const [selectedSoundId, setSelectedSoundId] = useState('none');
  
  const soundObject = useRef<Audio.Sound | null>(null);
  const timerViewRef = useRef<View>(null);
  const circleCenterRef = useRef({ x: 0, y: 0 });

  // --- 1. 定義輔助函數 (必須放在使用它們的 Effect 之前) ---

  const getTodayStr = () => new Date().toISOString().split('T')[0];
  const getYesterdayStr = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  };

  const handleUpdateStreak = async () => {
    if (!USER_ID) return;
    const today = getTodayStr();
    const yesterday = getYesterdayStr();
    if (lastFocusDate === today) return;

    try {
      const userRef = doc(db, 'users', USER_ID);
      let newStreak = streak;
      if (lastFocusDate === yesterday) { newStreak += 1; } 
      else { newStreak = 1; }

      await updateDoc(userRef, { streak: newStreak, lastFocusDate: today });
    } catch (e) { console.log(e); }
  };

  const syncToFirebase = async () => {
    if (!USER_ID) return;
    try {
      await updateDoc(doc(db, 'users', USER_ID), {
        status: currentMode,
        timeLeft: timeLeft,
        isFocusing: isActive && !isBreak,
      });
    } catch (e) { console.log(e); }
  };

  const getCurrentPetImage = () => {
    const petData = PETS_DATA[selectedPetId as keyof typeof PETS_DATA] || PETS_DATA.elephant;
    if (showCryingPet) return petData.stages.crying;
    if (isBreak) return petData.stages.child;
    if (!isActive && timeLeft === focusMinutes * 60) return petData.stages.baby;

    const totalSeconds = focusMinutes * 60;
    const percentageLeft = totalSeconds > 0 ? (timeLeft / totalSeconds) * 100 : 100;

    if (percentageLeft > 70) return petData.stages.baby; // 前30%
    if (percentageLeft <= 20) return petData.stages.adult; // 最後20%
    return petData.stages.child; // 中間
  };

  // --- 2. 使用效果 (Effects) ---

  // Firebase 數據監聽與 Streak 重置檢查
  useEffect(() => {
    if (!USER_ID) return;
    const userRef = doc(db, 'users', USER_ID);

    const unsub = onSnapshot(userRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.streak !== undefined) setStreak(data.streak);
        if (data.lastFocusDate !== undefined) setLastFocusDate(data.lastFocusDate);
      }
    });

    const checkStreakReset = async () => {
      const userSnap = await getDoc(userRef); 
      if (userSnap.exists()) {
        const data = userSnap.data();
        const lastDateStr = data.lastFocusDate;
        if (lastDateStr) {
          const today = new Date();
          const lastDate = new Date(lastDateStr);
          today.setHours(0, 0, 0, 0);
          lastDate.setHours(0, 0, 0, 0);
          const diffDays = Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
          if (diffDays > 1) { await updateDoc(userRef, { streak: 0 }); }
        }
      }
    };
    checkStreakReset();
    return () => unsub();
  }, [USER_ID]);

  // 計時器邏輯
  useEffect(() => {
    let iv: any = null;
    if (isActive && timeLeft > 0) {
      iv = setInterval(() => setTimeLeft(t => t - 1), 1000);
    } else if (isActive && timeLeft === 0) {
      if (!isBreak) {
        if (currentRound < totalRounds) {
          setIsBreak(true); setTimeLeft(breakMinutes * 60);
          Alert.alert("Break Time!");
        } else {
          setIsActive(false); setCurrentRound(1); setTimeLeft(focusMinutes * 60);
          handleUpdateStreak(); 
          Alert.alert("Mission Complete!");
        }
      } else {
        setCurrentRound(r => r + 1); setIsBreak(false); setTimeLeft(focusMinutes * 60);
      }
    }
    return () => clearInterval(iv);
  }, [isActive, timeLeft, isBreak, currentRound, totalRounds]);

  // 同步狀態
  useEffect(() => { syncToFirebase(); }, [currentMode, isActive, isBreak, selectedPetId]);

  // 音頻設置
  useEffect(() => {
    Audio.setAudioModeAsync({ allowsRecordingIOS: false, playsInSilentModeIOS: true, staysActiveInBackground: true });
    return () => { if (soundObject.current) soundObject.current.unloadAsync(); };
  }, []);

  // --- 3. 交互處理器 ---

  const handleToggleTimer = () => {
    if (isActive && !isBreak) {
      Alert.alert("Abandon your pet? 😭", "Stopping now will reset progress!", [
        { text: "Stay Focused", style: "cancel" },
        { text: "Abandon", style: "destructive", onPress: () => {
          setIsActive(false);
          setTimeLeft(focusMinutes * 60);
          setShowCryingPet(true);
          setTimeout(() => setShowCryingPet(false), 4000);
        }}
      ]);
    } else {
      if (!isActive) setShowCryingPet(false);
      setIsActive(!isActive);
    }
  };

  const handleSoundSelect = async (soundId: string) => {
    if (soundObject.current) { await soundObject.current.unloadAsync(); soundObject.current = null; }
    setSelectedSoundId(soundId);
    const selected = AMBIENT_SOUNDS.find(s => s.id === soundId);
    if (soundId !== 'none' && selected?.file) {
      const { sound } = await Audio.Sound.createAsync(selected.file, { shouldPlay: true, isLooping: true, volume: 0.5 });
      soundObject.current = sound;
    }
  };

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => !isActive,
    onMoveShouldSetPanResponder: () => !isActive,
    onPanResponderMove: (evt) => {
      const { pageX, pageY } = evt.nativeEvent;
      const { x: cx, y: cy } = circleCenterRef.current;
      let angle = Math.atan2(pageX - cx, -(pageY - cy)) * (180 / Math.PI);
      if (angle < 0) angle += 360;
      let snapped = Math.round(((angle / 360) * MAX_MINUTES) / STEP_MINUTES) * STEP_MINUTES;
      setFocusMinutes(snapped);
      if (!isBreak) setTimeLeft(snapped * 60);
    }
  }), [isActive, isBreak]);

  const measureCenter = () => timerViewRef.current?.measure((_fx, _fy, w, h, px, py) => {
    circleCenterRef.current = { x: px + w / 2, y: py + h / 2 };
  });

  const circumference = 2 * Math.PI * RING_CENTER_R;
  const progressRatio = (isActive ? (timeLeft / 60) : focusMinutes) / MAX_MINUTES;
  const angle = (focusMinutes / MAX_MINUTES) * 360;
  const rad = (angle - 90) * (Math.PI / 180);
  const handleX = CIRCLE_RADIUS + RING_CENTER_R * Math.cos(rad);
  const handleY = CIRCLE_RADIUS + RING_CENTER_R * Math.sin(rad);

  // --- 4. 渲染 UI ---

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.streakContainer}>
          <FontAwesome5 name="fire" size={18} color="#FF6B00" />
          <Text style={styles.streakText}>{streak}</Text>
        </View>
        <View style={styles.dropdownWrapper}>
          <DropDownPicker open={open} value={currentMode} items={items} setOpen={setOpen} setValue={setCurrentMode} setItems={setItems} style={styles.dropdown} dropDownContainerStyle={styles.dropdownMenu} showArrowIcon={true} textStyle={styles.dropdownLabel} />
        </View>
        <View style={styles.headerRightGroup}>
          <TouchableOpacity onPress={() => setPetModalVisible(true)} disabled={isActive} style={[styles.headerIconBtn, isActive && { opacity: 0.3 }]}>
            <MaterialCommunityIcons name="paw" size={22} color={theme.colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.headerIconBtn, { marginLeft: 10 }]} onPress={() => setSoundModalVisible(true)}>
            <MaterialCommunityIcons name={selectedSoundId === 'none' ? "music-note-off" : "music-note"} size={22} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.statusTitle}>{isActive ? (isBreak ? "Resting" : "Focusing") : "Set Goal"}</Text>

      {/* Timer Circle */}
      <View ref={timerViewRef} onLayout={measureCenter} style={styles.timerContainer} {...panResponder.panHandlers}>
        <Svg width={CIRCLE_SIZE} height={CIRCLE_SIZE}>
          <G rotation="-90" origin={`${CIRCLE_RADIUS}, ${CIRCLE_RADIUS}`}>
            <Circle cx={CIRCLE_RADIUS} cy={CIRCLE_RADIUS} r={RING_CENTER_R} stroke={theme.dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)"} strokeWidth={RING_WIDTH} fill="none" />
            <Circle cx={CIRCLE_RADIUS} cy={CIRCLE_RADIUS} r={RING_CENTER_R} stroke={theme.colors.primary} strokeWidth={RING_WIDTH} fill="none" strokeDasharray={circumference} strokeDashoffset={circumference * (1 - progressRatio)} strokeLinecap="round" />
          </G>
        </Svg>
        <View style={styles.centerContent} pointerEvents="none">
          <Image source={getCurrentPetImage()} style={styles.petImage} resizeMode="contain" />
        </View>
        {!isActive && <View style={[styles.sliderHandle, { left: handleX - HANDLE_SIZE / 2, top: handleY - HANDLE_SIZE / 2 }]} />}
      </View>

      {/* Info Card */}
      <View style={styles.infoCard}>
        <Text style={styles.timeText}>{Math.floor(timeLeft / 60).toString().padStart(2, '0')}:{(timeLeft % 60).toString().padStart(2, '0')}</Text>
        <TouchableOpacity style={styles.summaryBadge} onPress={() => setModalVisible(true)}>
          <Feather name="clock" size={14} color={theme.colors.primary} />
          <Text style={styles.summaryText}>{breakMinutes}m Rest • Round {currentRound}/{totalRounds}</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.mainButton} onPress={handleToggleTimer}>
        <Text style={styles.mainButtonText}>{isActive ? 'PAUSE' : 'START'}</Text>
      </TouchableOpacity>

      <Modal visible={isPetModalVisible} animationType="slide" transparent>
        <Pressable style={styles.modalOverlay} onPress={() => setPetModalVisible(false)}>
          <Pressable style={styles.modalContent} onPress={e => e.stopPropagation()}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Choose Your Buddy</Text>
            <FlatList 
              data={PETS_LIST}
              numColumns={2}
              columnWrapperStyle={{justifyContent: 'space-between'}}
              keyExtractor={item => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={[styles.petOptionCard, selectedPetId === item.id && styles.petOptionCardActive]}
                  onPress={() => setSelectedPetId(item.id)}
                >
                  <Image source={item.stages.adult} style={styles.petOptionImage} resizeMode="contain" />
                  <Text style={[styles.petOptionName, selectedPetId === item.id && {color: '#FFF'}]}>{item.name}</Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity style={styles.confirmBtn} onPress={() => setPetModalVisible(false)}>
              <Text style={{color:'#FFF', fontWeight:'bold'}}>Confirm</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ⚙️ 2. 計時設定 Modal */}
      <Modal visible={isModalVisible} animationType="slide" transparent>
        <Pressable style={styles.modalOverlay} onPress={() => setModalVisible(false)}>
          <Pressable style={styles.modalContent} onPress={e => e.stopPropagation()}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Timer Config</Text>
            <View style={styles.settingRow}>
              <View><Text style={styles.label}>Break Time</Text><Text style={styles.subLabel}>Minutes</Text></View>
              <View style={styles.stepper}>
                <TouchableOpacity onPress={() => setBreakMinutes(Math.max(1, breakMinutes - 1))}><Feather name="minus" size={20}/></TouchableOpacity>
                <Text style={styles.stepVal}>{breakMinutes}m</Text>
                <TouchableOpacity onPress={() => setBreakMinutes(breakMinutes + 1)}><Feather name="plus" size={20}/></TouchableOpacity>
              </View>
            </View>
            <View style={styles.settingRow}>
              <View><Text style={styles.label}>Total Rounds</Text><Text style={styles.subLabel}>Sessions</Text></View>
              <View style={styles.stepper}>
                <TouchableOpacity onPress={() => setTotalRounds(Math.max(1, totalRounds - 1))}><Feather name="minus" size={20}/></TouchableOpacity>
                <Text style={styles.stepVal}>{totalRounds}</Text>
                <TouchableOpacity onPress={() => setTotalRounds(totalRounds + 1)}><Feather name="plus" size={20}/></TouchableOpacity>
              </View>
            </View>
            <TouchableOpacity style={styles.confirmBtn} onPress={() => setModalVisible(false)}>
              <Text style={{color:'#FFF', fontWeight:'bold'}}>Done</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* 🎵 3. 環境音效 Modal */}
      <Modal visible={isSoundModalVisible} animationType="fade" transparent>
        <Pressable style={styles.modalOverlay} onPress={() => setSoundModalVisible(false)}>
          <Pressable style={styles.modalContent} onPress={e => e.stopPropagation()}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Ambient Sounds</Text>
            <View style={styles.soundGrid}>
              {AMBIENT_SOUNDS.map((s) => (
                <TouchableOpacity 
                  key={s.id} 
                  style={[styles.soundItem, selectedSoundId === s.id && styles.soundItemActive]} 
                  onPress={() => handleSoundSelect(s.id)}
                >
                  <MaterialCommunityIcons name={s.icon as any} size={30} color={selectedSoundId === s.id ? '#FFF' : theme.colors.text1} />
                  <Text style={[styles.soundName, selectedSoundId === s.id && { color: '#FFF' }]}>{s.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={styles.confirmBtn} onPress={() => setSoundModalVisible(false)}>
              <Text style={{color:'#FFF', fontWeight:'bold'}}>Done</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

    </SafeAreaView>
  )
}


const createStyles = (theme: Theme) => StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.background,
    paddingBottom: 40,
  },

  header: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 10,
    zIndex: 1000,
  },
  streakContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 107, 0, 0.1)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    minWidth: 55,
  },
  streakText: {
    marginLeft: 5,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF6B00',
  },
  dropdownWrapper: {
    flex: 1,
    marginHorizontal: 10,
    maxWidth: 150,
  },
  dropdown: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    minHeight: 40,
  },
  dropdownMenu: {
    borderWidth: 0,
    borderRadius: 15,
    elevation: 5,
    backgroundColor: '#FFF',
  },
  dropdownLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: theme.colors.text1,
    textAlign: 'center',
  },
  headerRightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIconBtn: {
    padding: 8,
    backgroundColor: theme.colors.card,
    borderRadius: 12,
  },

  titleContainer: {
    alignItems: 'center',
    marginTop: 10,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text2,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  timerContainer: {
    position: 'relative',
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerContent: {
    position: 'absolute',
    width: '65%',
    height: '65%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  petImage: {
    width: '100%',
    height: '100%',
  },
  sliderHandle: {
    position: 'absolute',
    width: HANDLE_SIZE,
    height: HANDLE_SIZE,
    borderRadius: HANDLE_SIZE / 2,
    backgroundColor: '#FFF',
    borderWidth: 5,
    borderColor: theme.colors.primary,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    zIndex: 999,
  },

  infoCard: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.02)',
    paddingVertical: 20,
    paddingHorizontal: 40,
    borderRadius: 30,
  },
  timeText: {
    fontSize: 72,
    fontWeight: '200',
    color: theme.colors.text1,
    fontVariant: ['tabular-nums'],
    letterSpacing: -2,
  },
  summaryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginTop: 10,
    elevation: 2,
  },
  summaryText: {
    fontSize: 14,
    marginHorizontal: 8,
    color: theme.colors.text1,
    fontWeight: '700',
  },

  mainButton: {
    backgroundColor: theme.colors.primary,
    width: width * 0.7,
    paddingVertical: 18,
    borderRadius: 40,
    alignItems: 'center',
    elevation: 8,
  },
  mainButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 2,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#F7F9F5',
    padding: 30,
    borderTopLeftRadius: 35,
    borderTopRightRadius: 35,
    maxHeight: '80%',
  },
  modalHandle: {
    width: 50,
    height: 5,
    backgroundColor: '#DDD',
    borderRadius: 5,
    alignSelf: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 25,
    textAlign: 'center',
    color: theme.colors.text1,
  },

  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: '#FFF',
    padding: 15,
    borderRadius: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text1,
  },
  subLabel: {
    fontSize: 12,
    color: '#999',
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    padding: 5,
    borderRadius: 15,
  },
  stepVal: {
    fontSize: 16,
    fontWeight: '800',
    width: 55,
    textAlign: 'center',
  },
  confirmBtn: {
    backgroundColor: theme.colors.primary,
    padding: 18,
    borderRadius: 25,
    alignItems: 'center',
    marginTop: 10,
  },

  petOptionCard: {
    width: '48%',
    backgroundColor: '#FFF',
    padding: 15,
    borderRadius: 20,
    alignItems: 'center',
    marginBottom: 15,
    elevation: 2,
    position: 'relative',
  },
  petOptionCardActive: {
    backgroundColor: theme.colors.primary,
    elevation: 5,
  },
  petOptionImage: {
    width: 70,
    height: 70,
    marginBottom: 10,
  },
  petOptionName: {
    fontWeight: '700',
    color: theme.colors.text1,
    fontSize: 12,
  },
  checkBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 2,
  },

  soundGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  soundItem: {
    width: '48%',
    backgroundColor: '#FFF',
    padding: 20,
    borderRadius: 20,
    alignItems: 'center',
    marginBottom: 15,
    elevation: 1,
  },
  soundItemActive: {
    backgroundColor: theme.colors.primary,
  },
  soundName: {
    marginTop: 10,
    fontWeight: '600',
    color: theme.colors.text1,
  },
});