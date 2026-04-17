import { StyleSheet, Text, View, TouchableOpacity, Modal, Pressable, ScrollView, Animated, Easing } from 'react-native'
import React, { useState, useMemo, useEffect, useRef } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native';
import Entypo from '@expo/vector-icons/Entypo';
import { Feather } from '@expo/vector-icons';
import DropDownPicker from 'react-native-dropdown-picker';

import { useTheme } from '../utils/ThemeContext';
import { Theme } from '../utils/Themes'; 

import { doc, setDoc, updateDoc, onSnapshot, increment } from 'firebase/firestore';
import { db, auth } from '../../firebaseConfig';

const getTodayStr = () => new Date().toISOString().split('T')[0];
const getYesterdayStr = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
};

export default function HomeScreen() {
  const navigation = useNavigation<any>()
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const USER_ID = auth.currentUser?.uid;

  const [streak, setStreak] = useState(0);
  const [lastFocusDate, setLastFocusDate] = useState<string | null>(null);
  
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState('English');
  const [items, setItems] = useState([
    { label: 'English', value: 'English' },
    { label: 'Finnish', value: 'Finnish' },
    { label: 'German', value: 'German' },
    { label: 'Project', value: 'Project' },
  ]);

  const [subjectConfigs, setSubjectConfigs] = useState<Record<string, {focus: number, break: number, rounds: number}>>({
    'English': { focus: 25, break: 5, rounds: 4 },
    'Finnish': { focus: 30, break: 5, rounds: 3 },
    'German': { focus: 20, break: 5, rounds: 4 },
    'Project': { focus: 45, break: 10, rounds: 2 },
  });

  const currentConfig = subjectConfigs[value] || { focus: 20, break: 5, rounds: 4 };

  const [timeLeft, setTimeLeft] = useState(currentConfig.focus * 60); 
  const [isActive, setIsActive] = useState(false);
  const [isBreak, setIsBreak] = useState(false); 
  const [currentRound, setCurrentRound] = useState(1); 
  const [isModalVisible, setModalVisible] = useState(false);
  const animatedTimeLeft = useRef(new Animated.Value(timeLeft)).current;

  const [username, setUsername] = useState('')

  useEffect(() => {
    if (!db || !USER_ID) return; 
    const userRef = doc(db, 'users', USER_ID);

    const unsubscribe = onSnapshot(userRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.streak !== undefined) setStreak(data.streak);
        if (data.lastFocusDate !== undefined) setLastFocusDate(data.lastFocusDate);
        if (data.subjectConfigs) setSubjectConfigs(data.subjectConfigs);

        setUsername(data.username)
      } else {
        setDoc(userRef, {
          streak: 0, 
          lastFocusDate: null,
          subjectConfigs: subjectConfigs 
        });
      }
    });
    return () => unsubscribe(); 
  }, []);


  console.log(username)

  const rotateAnimation = animatedTimeLeft.interpolate({
    inputRange: [0, (isBreak ? currentConfig.break : currentConfig.focus) * 60],
    outputRange: ['360deg', '0deg'], 
  });

  useEffect(() => {
    Animated.timing(animatedTimeLeft, {
      toValue: timeLeft, 
      duration: isActive && timeLeft > 0 ? 1000 : 0,
      easing: Easing.linear,
      useNativeDriver: true, 
    }).start();
  }, [isActive, timeLeft, animatedTimeLeft]);

  useEffect(() => {
    setIsActive(false);
    setIsBreak(false);
    setCurrentRound(1);
    const newFocusTime = subjectConfigs[value] ? subjectConfigs[value].focus * 60 : 20*60;
    setTimeLeft(newFocusTime);
    animatedTimeLeft.setValue(newFocusTime);
  }, [value, animatedTimeLeft]); 

  useEffect(() => {
    if (!isActive) {
      const newTotalSeconds = isBreak ? currentConfig.break * 60 : currentConfig.focus * 60;
      setTimeLeft(newTotalSeconds);
      animatedTimeLeft.setValue(newTotalSeconds);
    }
  }, [currentConfig.focus, currentConfig.break, isBreak, animatedTimeLeft, isActive]);

  useEffect(() => {
    let interval: any = null; 

    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
      setTimeLeft(prevTime => prevTime - 1); 
        }, 1000); 
    } 
    else if (isActive && timeLeft === 0) {
      clearInterval(interval);
          
      if (!isBreak) {
        if (currentRound < currentConfig.rounds) {
          setIsBreak(true);
          const nextBreakTime = currentConfig.break * 60;
          setTimeLeft(nextBreakTime);
          animatedTimeLeft.setValue(nextBreakTime); 
        } else {
          setIsActive(false); 
          setIsBreak(false);
          setCurrentRound(1);
          const resetFocusTime = currentConfig.focus * 60;
          setTimeLeft(resetFocusTime);
          animatedTimeLeft.setValue(resetFocusTime); 

          const today = getTodayStr();
          const yesterday = getYesterdayStr();
          let newStreak = streak;

          if (lastFocusDate === yesterday) {
            newStreak = streak + 1; 
          } else if (lastFocusDate === today) {
            newStreak = streak; 
          } else {
            newStreak = 1;
          }

          updateDoc(doc(db, 'users', USER_ID as string), {
             streak: newStreak,
             lastFocusDate: today,
             coins: increment(20)
          });
        }
      } else {
        setCurrentRound(prev => prev + 1);
        setIsBreak(false);
        const nextFocusTime = currentConfig.focus * 60;
        setTimeLeft(nextFocusTime);
        animatedTimeLeft.setValue(nextFocusTime); 
      }
    }

    return () => clearInterval(interval);
  }, [isActive, timeLeft, isBreak, currentConfig, currentRound, animatedTimeLeft, streak, lastFocusDate]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleToggleTimer = () => setIsActive(!isActive);

  const adjustSetting = (type: 'focus' | 'break' | 'rounds', amount: number) => {
      setSubjectConfigs(prev => {
          const config = prev[value]; 
          let newFocus = config.focus;
          let newBreak = config.break;
          let newRounds = config.rounds;

          if (type === 'focus') newFocus = Math.max(5, config.focus + amount);
          else if (type === 'break') newBreak = Math.max(1, config.break + amount);
          else if (type === 'rounds') newRounds = Math.max(1, config.rounds + amount);

          return { ...prev, [value]: { focus: newFocus, break: newBreak, rounds: newRounds } };
      });
  }

  const handleSaveSettings = async () => {
    if (!USER_ID) return;

    try {
      const userRef = doc(db, 'users', USER_ID);
      await updateDoc(userRef, { subjectConfigs: subjectConfigs });
      setModalVisible(false); 
    } catch (error) {
      console.error("Error saving settings: ", error);
      alert("save error");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.header, { zIndex: 1000 }]}>
        <View style={styles.coinBadge}>
          <Text style={styles.coinText}>🔥 {streak}</Text>
        </View>

        <View style={styles.dropdownContainer}>
          <DropDownPicker
            open={open}
            value={value}
            items={items}
            setOpen={setOpen}
            setValue={setValue}
            setItems={setItems}
            style={styles.dropdownBadge} 
            dropDownContainerStyle={styles.dropdownList} 
            textStyle={styles.dropdownText} 
            showArrowIcon={true} 
            arrowIconStyle={{ tintColor: theme.colors.text1 } as any}
            tickIconStyle={{ display: 'none' } as any } 
          />
        </View>

        <TouchableOpacity style={styles.iconButton} onPress={() => navigation.navigate('CalendarScreen')}>
          <Entypo name="calendar" size={26} color={theme.colors.text1} />
        </TouchableOpacity>
      </View>
      
      <View style={styles.titleContainer}>
          <Text style={styles.roundText}>Session {currentRound} of {currentConfig.rounds}</Text>
          <Text style={styles.title}>
            {isActive 
                ? (isBreak ? 'Take a break ☕️' : `Focusing on ${value}...`) 
                : (isBreak ? 'Ready to rest?' : `Ready for ${value}?`)
            }
          </Text>
      </View>

      <View style={styles.timerContainer}>
        <View style={styles.timerCircle}>
          <Text style={styles.animalImage}>{isBreak ? '💤' : '🐱'}</Text>
        </View>
        
        <Animated.View style={[
            styles.dotRotatorContainer,
            { transform: [{ rotate: rotateAnimation }] } 
        ]}>
            <View style={styles.progressDot} />
        </Animated.View>
      </View>

      <TouchableOpacity 
        style={styles.timeWrapper} 
        onPress={() => !isActive && setModalVisible(true)} 
        activeOpacity={0.6}
      >
        <Text style={[styles.timeText, !isActive && { color: theme.colors.primary }]}>
            {formatTime(timeLeft)}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={[styles.feedButton, isActive && { backgroundColor: theme.colors.text2 }]} 
        activeOpacity={0.8}
        onPress={handleToggleTimer}
      >
        <Text style={styles.feedButtonText}>
          {isActive ? 'PAUSE' : (isBreak ? 'REST' : 'FEED')}
        </Text>
      </TouchableOpacity>

      <Modal
        animationType="slide"
        transparent={true}
        visible={isModalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setModalVisible(false)}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHandle} />
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
              <Text style={styles.modalTitle}>{value} Settings</Text>
              <Text style={styles.modalSubtitle}>Customize your focus and break sessions for {value}.</Text>

              <View style={styles.settingRow}>
                <View>
                    <Text style={styles.inputLabel}>Focus Duration</Text>
                    <Text style={styles.helperText}>Set your study time</Text>
                </View>
                <View style={styles.stepper}>
                    <TouchableOpacity style={styles.stepButton} onPress={() => adjustSetting('focus', -5)}>
                        <Feather name="minus" size={20} color={theme.colors.text1} />
                    </TouchableOpacity>
                    <Text style={styles.stepText}>{currentConfig.focus} m</Text>
                    <TouchableOpacity style={styles.stepButton} onPress={() => adjustSetting('focus', 5)}>
                        <Feather name="plus" size={20} color={theme.colors.text1} />
                    </TouchableOpacity>
                </View>
              </View>

              <View style={styles.settingRow}>
                <View>
                    <Text style={styles.inputLabel}>Break Duration</Text>
                    <Text style={styles.helperText}>Set your break time</Text>
                </View>
                <View style={styles.stepper}>
                    <TouchableOpacity style={styles.stepButton} onPress={() => adjustSetting('break', -1)}>
                        <Feather name="minus" size={20} color={theme.colors.text1} />
                    </TouchableOpacity>
                    <Text style={styles.stepText}>{currentConfig.break} m</Text>
                    <TouchableOpacity style={styles.stepButton} onPress={() => adjustSetting('break', 1)}>
                        <Feather name="plus" size={20} color={theme.colors.text1} />
                    </TouchableOpacity>
                </View>
              </View>

              <View style={styles.settingRow}>
                <View>
                    <Text style={styles.inputLabel}>Sessions (Rounds)</Text>
                    <Text style={styles.helperText}>How many rounds?</Text>
                </View>
                <View style={styles.stepper}>
                    <TouchableOpacity style={styles.stepButton} onPress={() => adjustSetting('rounds', -1)}>
                        <Feather name="minus" size={20} color={theme.colors.text1} />
                    </TouchableOpacity>
                    <Text style={styles.stepText}>{currentConfig.rounds}</Text> 
                    <TouchableOpacity style={styles.stepButton} onPress={() => adjustSetting('rounds', 1)}>
                        <Feather name="plus" size={20} color={theme.colors.text1} />
                    </TouchableOpacity>
                </View>
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.confirmButton} onPress={handleSaveSettings}>
                  <Text style={styles.confirmButtonText}>Save Changes</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
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
    backgroundColor: theme.colors.background,
  },

  header: { 
    width: '100%', 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 25, 
    marginTop: 15, 
    marginBottom: 30,
  },

  coinBadge: { 
    backgroundColor: 'rgba(255,255,255,0.5)', 
    paddingVertical: 8, 
    paddingHorizontal: 15, 
    borderRadius: 20,
  },

  coinText: { 
    fontSize: 16, 
    fontWeight: '700', 
    color: theme.colors.text1,
  },

  iconButton: { 
    padding: 10,
  },

  dropdownContainer: { 
    width: 140,
  },

  dropdownBadge: { 
    backgroundColor: theme.colors.card, 
    borderRadius: 25, 
    borderWidth: 0, 
    minHeight: 45, 
    paddingHorizontal: 20,
  },

  dropdownList: { 
    backgroundColor: '#FFF', 
    borderWidth: 0, 
    borderRadius: 20, 
    marginTop: 5, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.1, 
    shadowRadius: 10, 
    elevation: 5,
  },

  dropdownText: { 
    fontSize: 16, 
    fontWeight: 'bold', 
    color: theme.colors.text1, 
    textAlign: 'center',
  },

  titleContainer: { 
    alignItems: 'center', 
    marginBottom: 40,
  },

  roundText: { 
    fontSize: 14, 
    fontWeight: '800', 
    color: theme.colors.primary, 
    marginBottom: 8, 
    textTransform: 'uppercase', 
    letterSpacing: 1.5,
  },

  title: { 
    fontSize: 26, 
    fontWeight: '800', 
    color: theme.colors.text1, 
    letterSpacing: 0.5,
  },

  timerContainer: { 
    position: 'relative', 
    alignItems: 'center', 
    justifyContent: 'center', 
    marginBottom: 40,
  },

  timerCircle: { 
    width: 280, 
    height: 280, 
    borderRadius: 140, 
    borderWidth: 4, 
    borderColor: theme.colors.text2, 
    justifyContent: 'center', 
    alignItems: 'center',
  },

  dotRotatorContainer: { 
    position: 'absolute', 
    top: 0, 
    left: 0, 
    right: 0, 
    bottom: 0, 
    justifyContent: 'flex-start',
    alignItems: 'center', 
    backgroundColor: 'transparent', 
  },
  
  progressDot: { 
    width: 20, 
    height: 20, 
    borderRadius: 10, 
    backgroundColor: theme.colors.primary, 
    borderWidth: 3, 
    borderColor: theme.colors.background, 
    marginTop: -10, 
  },
  
  animalImage: { 
    fontSize: 120,
  },
  timeWrapper: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    marginBottom: 30,
  },

  timeText: { 
    fontSize: 56, 
    fontWeight: '800', 
    color: theme.colors.text1, 
    fontVariant: ['tabular-nums'],
  },

  feedButton: { 
    backgroundColor: theme.colors.primary, 
    width: 200, 
    paddingVertical: 18, 
    borderRadius: 30, 
    alignItems: 'center', 
    shadowColor: theme.colors.primary, 
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.2, 
    shadowRadius: 8, 
    elevation: 4,
  },

  feedButtonText: { 
    fontSize: 18, 
    color: '#FFF', 
    fontWeight: '800', 
    letterSpacing: 2,
  },

  modalOverlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0, 0, 0, 0.4)', 
    justifyContent: 'flex-end',
  },

  modalContent: { 
    backgroundColor: '#F7F9F5', 
    borderTopLeftRadius: 35, 
    borderTopRightRadius: 35, 
    paddingHorizontal: 30, 
    paddingTop: 15, 
    paddingBottom: 20,
  },

  modalHandle: { 
    width: 50, 
    height: 5, 
    backgroundColor: '#D1D5DB', 
    borderRadius: 5, 
    alignSelf: 'center', 
    marginBottom: 25,
  },

  modalTitle: { 
    fontSize: 26, 
    fontWeight: '800', 
    color: theme.colors.text1, 
    marginBottom: 10,
  },

  modalSubtitle: { 
    fontSize: 14, 
    color: theme.colors.text2, 
    lineHeight: 20, 
    marginBottom: 30,
  },

  settingRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 20, 
    backgroundColor: '#FFF', 
    padding: 20, 
    borderRadius: 25, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.05, 
    shadowRadius: 5, 
    elevation: 2,
  },

  inputLabel: { 
    fontSize: 16, 
    fontWeight: '800', 
    color: theme.colors.text1, 
    marginBottom: 4,
  },

  helperText: { 
    fontSize: 13, 
    color: theme.colors.text2, 
    fontWeight: '600',
  },

  stepper: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#E5EDDF', 
    borderRadius: 20, 
    padding: 5,
  },

  stepButton: { 
    width: 36, 
    height: 36, 
    borderRadius: 18, 
    backgroundColor: '#FFF', 
    justifyContent: 'center', 
    alignItems: 'center', 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 1 }, 
    shadowOpacity: 0.1, 
    shadowRadius: 2, 
    elevation: 1,
  },

  stepText: { 
    fontSize: 16, 
    fontWeight: '800', 
    color: theme.colors.text1, 
    width: 55, 
    textAlign: 'center',
  },

  modalActions: { 
    marginTop: 15,
  },

  confirmButton: { 
    width: '100%', 
    paddingVertical: 18, 
    borderRadius: 25, 
    alignItems: 'center', 
    backgroundColor: theme.colors.primary,
  },

  confirmButtonText: { 
    fontSize: 16, 
    fontWeight: 'bold', 
    color: '#FFF',
  }
});