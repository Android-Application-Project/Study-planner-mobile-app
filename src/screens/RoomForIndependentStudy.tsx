import { StyleSheet, Text, View, TouchableOpacity, Animated, Easing, FlatList, Modal, Pressable, ScrollView } from 'react-native'
import React, { useState, useMemo, useEffect, useRef } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation, useRoute } from '@react-navigation/native';
import { Feather, Ionicons } from '@expo/vector-icons';
import DropDownPicker from 'react-native-dropdown-picker';

import { useTheme } from '../utils/ThemeProvider';
import { Theme } from '../utils/Themes'; 

const EmojiAvatar = ({ emoji, size, bgColor }: { emoji: string, size: number, bgColor: string }) => {
  const radius = size / 2;
  return (
    <View style={{ width: size, height: size, borderRadius: radius, backgroundColor: bgColor, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ fontSize: size * 0.5 }}>{emoji}</Text>
    </View>
  );
};

export default function RoomForIndependentStudy() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const { roomName, icon } = route.params || { roomName: 'Late Night Cafe', icon: '☕️' };

  const [members, setMembers] = useState([
    { id: '2', name: 'Jason', emoji: '🦁', subject: 'Math', status: 'Focusing' },
    { id: '3', name: 'Christopher', emoji: '🐼', subject: 'Coding', status: 'Resting' },
    { id: '4', name: 'Emma', emoji: '🐰', subject: 'History', status: 'Focusing' },
  ]);

  const [open, setOpen] = useState(false);
  const [value, setValue] = useState('English');
  const [items, setItems] = useState([
    { label: 'English', value: 'English' },
    { label: 'Finnish', value: 'Finnish' },
    { label: 'Project', value: 'Project' },
  ]);

  const [subjectConfigs, setSubjectConfigs] = useState<Record<string, {focus: number, break: number}>>({
    'English': { focus: 25, break: 5 },
    'Finnish': { focus: 30, break: 5 },
    'Project': { focus: 45, break: 10 },
  });

  const currentConfig = subjectConfigs[value] || { focus: 20, break: 5 };

  const [timeLeft, setTimeLeft] = useState(currentConfig.focus * 60); 
  const [isActive, setIsActive] = useState(false);
  const [isBreak, setIsBreak] = useState(false); 
  const [isModalVisible, setModalVisible] = useState(false);

  const animatedTimeLeft = useRef(new Animated.Value(timeLeft)).current;
  const rotateAnimation = animatedTimeLeft.interpolate({
    inputRange: [0, (isBreak ? currentConfig.break : currentConfig.focus) * 60],
    outputRange: ['360deg', '0deg'],
  });

  useEffect(() => {
    Animated.timing(animatedTimeLeft, {
      toValue: timeLeft, duration: isActive && timeLeft > 0 ? 1000 : 0, easing: Easing.linear, useNativeDriver: true,
    }).start();
  }, [isActive, timeLeft, animatedTimeLeft]);

  useEffect(() => {
    setIsActive(false); setIsBreak(false);
    const newFocusTime = subjectConfigs[value] ? subjectConfigs[value].focus * 60 : 20*60;
    setTimeLeft(newFocusTime);
    animatedTimeLeft.setValue(newFocusTime);
  }, [value, animatedTimeLeft]); 

  useEffect(() => {
      let interval: any = null; 
      if (isActive && timeLeft > 0) {
        interval = setInterval(() => { setTimeLeft(prevTime => prevTime - 1); }, 1000); 
      } else if (isActive && timeLeft === 0) {
        clearInterval(interval);
        const nextIsBreak = !isBreak;
        setIsBreak(nextIsBreak);
        const nextTime = (nextIsBreak ? currentConfig.break : currentConfig.focus) * 60;
        setTimeLeft(nextTime);
        animatedTimeLeft.setValue(nextTime);
        setIsActive(false); 
        
      }
      return () => clearInterval(interval);
  }, [isActive, timeLeft, isBreak, currentConfig, animatedTimeLeft]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60); const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleToggleTimer = () => setIsActive(!isActive);

  const renderMember = ({ item }: any) => (
    <View style={styles.memberCard}>
      <EmojiAvatar size={44} emoji={item.emoji} bgColor='#E5EDDF' />
      <View style={styles.memberInfo}>
        <View style={styles.memberNameRow}>
            <Text style={styles.memberName}>{item.name}</Text>
            <View style={styles.miniSubjectPill}>
                <Text style={styles.miniSubjectText}>{item.subject}</Text>
            </View>
        </View>
        <Text style={[styles.memberStatus, { color: item.status === 'Focusing' ? theme.colors.primary : theme.colors.text2 }]}>
            {item.status}
        </Text>
      </View>
      {item.status === 'Focusing' ? (
        <Feather name="clock" size={20} color={theme.colors.primary} />
      ) : (
        <Text style={{fontSize: 18}}>☕️</Text>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.header, { zIndex: 1000 }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text1} />
        </TouchableOpacity>
        
        <View style={styles.titleContainer}>
            <View style={styles.headerNameRow}>
                <Text style={styles.roomIconText}>{icon}</Text>
                <Text style={styles.roomTitleText}>{roomName}</Text>
            </View>
            <Text style={styles.roomSubtitle}>Co-working Space</Text>
        </View>

        <View style={styles.dropdownContainer}>
          <DropDownPicker
            open={open} value={value} items={items} setOpen={setOpen} setValue={setValue} setItems={setItems}
            style={styles.dropdownBadge} dropDownContainerStyle={styles.dropdownList} textStyle={styles.dropdownText} 
            showArrowIcon={false} tickIconStyle={{ display: 'none' } as any } 
          />
        </View>
      </View>
      
      <View style={styles.timerContainer}>
        <View style={styles.timerCircle}>
          <Text style={styles.animalImage}>{isBreak ? '💤' : '🐱'}</Text>
        </View>
        <Animated.View style={[styles.dotRotatorContainer, { transform: [{ rotate: rotateAnimation }] }]}>
            <View style={styles.progressDot} />
        </Animated.View>
      </View>

      <TouchableOpacity style={styles.timeWrapper} onPress={() => !isActive && setModalVisible(true)} activeOpacity={0.6}>
        <Text style={[styles.timeText, !isActive && { color: theme.colors.primary }]}>{formatTime(timeLeft)}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.feedButton, isActive && { backgroundColor: theme.colors.text2 }]} activeOpacity={0.8} onPress={handleToggleTimer}>
        <Text style={styles.feedButtonText}>{isActive ? 'PAUSE' : (isBreak ? 'REST' : 'FOCUS')}</Text>
      </TouchableOpacity>

      <View style={styles.membersPanel}>
          <View style={styles.membersHeader}>
            <Text style={styles.membersTitle}>Roommates ({members.length + 1})</Text>
          </View>
          <FlatList
            data={members}
            keyExtractor={item => item.id}
            renderItem={renderMember}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.membersList}
          />
      </View>

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
    marginBottom: 20,
  },
  backButton: { 
    padding: 10, 
    backgroundColor: theme.colors.card, 
    borderRadius: 20,
  },
  titleContainer: { 
    alignItems: 'center',
  },
  headerNameRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 2,
  },
  roomIconText: { 
    fontSize: 18, 
    marginRight: 6,
  },
  roomTitleText: { 
    fontSize: 18, 
    fontWeight: '800', 
    color: theme.colors.text1,
  },
  roomSubtitle: { 
    fontSize: 12, 
    color: theme.colors.text2, 
    fontWeight: '600',
  },
  
  dropdownContainer: { 
    width: 100,
  },
  dropdownBadge: { 
    backgroundColor: '#E5EDDF', 
    borderRadius: 20, 
    borderWidth: 0, 
    minHeight: 36, 
    paddingHorizontal: 10,
  },
  dropdownList: { 
    backgroundColor: '#FFF', 
    borderWidth: 0, 
    borderRadius: 15, 
    marginTop: 5, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.1, 
    shadowRadius: 10, 
    elevation: 5,
  },
  dropdownText: { 
    fontSize: 13, 
    fontWeight: 'bold', 
    color: theme.colors.primary, 
    textAlign: 'center',
  },
  
  timerContainer: { 
    position: 'relative', 
    alignItems: 'center', 
    justifyContent: 'center', 
    marginBottom: 20,
  },
  timerCircle: { 
    width: 240, 
    height: 240, 
    borderRadius: 120, 
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
    fontSize: 100,
  },
  
  timeWrapper: { 
    marginBottom: 15,
  },
  timeText: { 
    fontSize: 48, 
    fontWeight: '800', 
    color: theme.colors.text1, 
    fontVariant: ['tabular-nums'],
  },
  feedButton: { 
    backgroundColor: theme.colors.primary, 
    width: 180, 
    paddingVertical: 15, 
    borderRadius: 25, 
    alignItems: 'center', 
    marginBottom: 20, 
    shadowColor: theme.colors.primary, 
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.2, 
    shadowRadius: 8, 
    elevation: 4,
  },
  feedButtonText: { 
    fontSize: 16, 
    color: '#FFF', 
    fontWeight: '800', 
    letterSpacing: 2,
  },
  
  membersPanel: { 
    flex: 1, 
    width: '100%', 
    backgroundColor: '#FFFFFF', 
    borderTopLeftRadius: 35, 
    borderTopRightRadius: 35, 
    paddingHorizontal: 25, 
    paddingTop: 20, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: -5 }, 
    shadowOpacity: 0.05, 
    shadowRadius: 10, 
    elevation: 10,
  },
  membersHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 15,
  },
  membersTitle: { 
    fontSize: 16, 
    fontWeight: '800', 
    color: theme.colors.text1,
  },
  membersList: { 
    paddingBottom: 20,
  },
  memberCard: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingVertical: 12, 
    borderBottomWidth: 1, 
    borderBottomColor: '#F3F4F6',
  },
  memberInfo: { 
    flex: 1, 
    marginHorizontal: 15,
  },
  memberNameRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 4,
  },
  memberName: { 
    fontSize: 15, 
    fontWeight: '700', 
    color: theme.colors.text1,
  },
  miniSubjectPill: { 
    backgroundColor: '#F3F4F6', 
    paddingVertical: 2, 
    paddingHorizontal: 6, 
    borderRadius: 6, 
    marginLeft: 8,
  },
  miniSubjectText: { 
    fontSize: 10, 
    fontWeight: '700', 
    color: theme.colors.text2,
  },
  memberStatus: { 
    fontSize: 12, 
    fontWeight: '600',
  }
});