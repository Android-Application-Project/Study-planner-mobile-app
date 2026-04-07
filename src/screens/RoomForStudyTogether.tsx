import { StyleSheet, Text, View, TouchableOpacity, Animated, Easing, FlatList } from 'react-native'
import React, { useState, useMemo, useEffect, useRef } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation, useRoute } from '@react-navigation/native';
import { Feather, Ionicons } from '@expo/vector-icons';

import { useTheme } from '../utils/ThemeProvider';
import { Theme } from '../utils/Themes'; 

// This is for firebase tomorrow
// import { doc, onSnapshot, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
// import { db, auth } from '../config/firebase';

const EmojiAvatar = ({ emoji, size, bgColor }: { emoji: string, size: number, bgColor: string }) => {
  const radius = size / 2;
  return (
    <View style={{ width: size, height: size, borderRadius: radius, backgroundColor: bgColor, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ fontSize: size * 0.5 }}>{emoji}</Text>
    </View>
  );
};

export default function RoomForStudyTogether() {
  const navigation = useNavigation<any>()
  const route = useRoute<any>()
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const { roomId, roomName, subject, icon } = route.params || { roomId: 'mock-id', roomName: 'Lavender Room', subject: 'English', icon: '🌸' };

  const [members, setMembers] = useState([
    { id: '1', name: 'Zhi Lin', emoji: '🦊', isHost: true, status: 'Ready' }, 
    { id: '2', name: 'Jason', emoji: '🦁', isHost: false, status: 'Ready' },
    { id: '3', name: 'Christopher', emoji: '🐼', isHost: false, status: 'Ready' },
  ]);
  const maxMembers = 4;

  const [focusMinutes, setFocusMinutes] = useState(25); 
  const [breakMinutes, setBreakMinutes] = useState(5);  
  
  const [timeLeft, setTimeLeft] = useState(focusMinutes * 60); 
  const [isActive, setIsActive] = useState(false);
  const [isBreak, setIsBreak] = useState(false); 

  const animatedTimeLeft = useRef(new Animated.Value(timeLeft)).current;

  const rotateAnimation = animatedTimeLeft.interpolate({
    inputRange: [0, (isBreak ? breakMinutes : focusMinutes) * 60],
    outputRange: ['360deg', '0deg'],
  });

  useEffect(() => {

    /* firebase for tomorrow
    if (!roomId) return;
    const roomRef = doc(db, 'rooms', roomId);
    const unsubscribe = onSnapshot(roomRef, (docSnap) => {
        if (docSnap.exists()) {
            const roomData = docSnap.data();
            setMembers(roomData.members || []);
            setIsActive(roomData.timerIsActive || false);
            setIsBreak(roomData.isBreak || false);
        }
    });

    // 3. leave the room (updateDoc + arrayRemove)
    return () => {
        unsubscribe(); 
        // kick myself out of the room
    };
    */
  }, [roomId]);

  useEffect(() => {
    Animated.timing(animatedTimeLeft, {
      toValue: timeLeft,
      duration: isActive && timeLeft > 0 ? 1000 : 0,
      easing: Easing.linear,
      useNativeDriver: true,
    }).start();
  }, [isActive, timeLeft, animatedTimeLeft]);

  useEffect(() => {
      let interval: any = null; 
      if (isActive && timeLeft > 0) {
        interval = setInterval(() => {
          setTimeLeft(prevTime => prevTime - 1); 
        }, 1000); 
      } 
      else if (isActive && timeLeft === 0) {
        clearInterval(interval);
        
        const nextIsBreak = !isBreak;
        setIsBreak(nextIsBreak);
        const nextTime = (nextIsBreak ? breakMinutes : focusMinutes) * 60;
        
        setTimeLeft(nextTime);
        animatedTimeLeft.setValue(nextTime);
        
        setIsActive(false); 
        
        setMembers(prev => prev.map(m => ({ ...m, status: nextIsBreak ? 'Resting' : 'Ready' })));
      }
      return () => clearInterval(interval);
  }, [isActive, timeLeft, isBreak, focusMinutes, breakMinutes, animatedTimeLeft]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleToggleTimer = () => {
    const newIsActive = !isActive;
    
    // here is for the fire base
    /*
    const roomRef = doc(db, 'rooms', roomId);
    updateDoc(roomRef, {
        timerIsActive: newIsActive,
        isBreak: isBreak,
        
    });
    */

    setIsActive(newIsActive);
    if (newIsActive) {
        setMembers(prev => prev.map(m => ({ ...m, status: isBreak ? 'Resting' : 'Focusing' })));
    } else {
        setMembers(prev => prev.map(m => ({ ...m, status: 'Paused' })));
    }
  }

  const renderMember = ({ item }: any) => (
    <View style={styles.memberCard}>
      <EmojiAvatar size={44} emoji={item.emoji} bgColor='#E5EDDF' />
      <View style={styles.memberInfo}>
        <View style={styles.memberNameRow}>
            <Text style={styles.memberName}>{item.name}</Text>
            {item.isHost && <Text style={styles.hostBadge}>Host</Text>}
        </View>
        <Text style={[
            styles.memberStatus, 
            { color: item.status === 'Focusing' ? theme.colors.primary : theme.colors.text2 }
        ]}>
            {item.status}
        </Text>
      </View>
      {item.status === 'Focusing' ? (
        <Feather name="clock" size={20} color={theme.colors.primary} />
      ) : item.status === 'Resting' ? (
        <Text style={{fontSize: 18}}>☕️</Text>
      ) : (
        <Feather name="check-circle" size={20} color="#4CAF50" />
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text1} />
        </TouchableOpacity>
        
        <View style={styles.titleContainer}>
            <View style={styles.headerNameRow}>
                <Text style={styles.roomIconText}>{icon}</Text>
                <Text style={styles.roomTitleText}>{roomName}</Text>
            </View>
            <View style={styles.subjectPill}>
                <Text style={styles.subjectPillText}>{subject}</Text>
            </View>
        </View>
        
        <TouchableOpacity style={styles.iconButton}>
          <Feather name="more-horizontal" size={24} color={theme.colors.text1} />
        </TouchableOpacity>
      </View>
      
      <View style={styles.timerContainer}>
        <View style={styles.timerCircle}>
          
          <View style={styles.avatarsWrapper}>
            {[...Array(maxMembers)].map((_, index) => {
              const member = members[index];
              return (
                <View key={index} style={styles.avatarSpot}>
                  {member ? (
                    <EmojiAvatar size={50} emoji={member.emoji} bgColor='#E5EDDF' />
                  ) : (
                    <TouchableOpacity style={styles.emptySpot} activeOpacity={0.7}>
                      <Feather name="plus" size={24} color={theme.colors.text2} />
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
          </View>

        </View>
        
        <Animated.View style={[styles.dotRotatorContainer, { transform: [{ rotate: rotateAnimation }] }]}>
            <View style={styles.progressDot} />
        </Animated.View>
      </View>

      <View style={styles.timeWrapper}>
        <Text style={styles.timeText}>{formatTime(timeLeft)}</Text>
      </View>

      <TouchableOpacity 
        style={[styles.feedButton, isActive && { backgroundColor: theme.colors.text2 }]} 
        activeOpacity={0.8}
        onPress={handleToggleTimer}
      >
        <Text style={styles.feedButtonText}>
          {isActive ? 'PAUSE' : (isBreak ? 'REST' : 'START FOCUS')}
        </Text>
      </TouchableOpacity>

      <View style={styles.membersPanel}>
          <View style={styles.membersHeader}>
            <Text style={styles.membersTitle}>Members ({members.length}/{maxMembers})</Text>
            <TouchableOpacity style={styles.inviteButton}>
                <Feather name="plus" size={16} color="#FFF" />
                <Text style={styles.inviteButtonText}>Invite</Text>
            </TouchableOpacity>
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
    marginBottom: 6,
  },
  roomIconText: {
    fontSize: 22,
    marginRight: 8,
  },
  roomTitleText: { 
    fontSize: 20, 
    fontWeight: '800', 
    color: theme.colors.text1, 
  },
  subjectPill: {
    backgroundColor: '#E5EDDF', 
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  subjectPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  iconButton: { 
    padding: 10,
  },
  timerContainer: { 
    position: 'relative', 
    alignItems: 'center', 
    justifyContent: 'center', 
    marginBottom: 20, 
  },
  timerCircle: { 
    width: 260, 
    height: 260, 
    borderRadius: 130, 
    borderWidth: 6, 
    borderColor: '#E5E7EB', 
    justifyContent: 'center', 
    alignItems: 'center',
    backgroundColor: 'transparent',
    overflow: 'visible', 
  },
  avatarsWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    width: 220, 
    height: 220,
  },
  avatarSpot: {
    width: 70, 
    height: 70,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 10,
  },
  emptySpot: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: theme.colors.text2,
    borderStyle: 'dashed', 
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
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
    width: 22, 
    height: 22, 
    borderRadius: 11, 
    backgroundColor: theme.colors.primary, 
    borderWidth: 4, 
    borderColor: theme.colors.background, 
    marginTop: -11, 
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
    marginBottom: 25,
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
      shadowColor: '#000', shadowOffset: { width: 0, height: -5 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 10, 
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
  inviteButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.primary,
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: 15,
  },
  inviteButtonText: {
      color: '#FFF',
      fontWeight: 'bold',
      marginLeft: 4,
      fontSize: 13,
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
    marginBottom: 2,
  },
  memberName: {
      fontSize: 15,
      fontWeight: '700',
      color: theme.colors.text1,
  },
  hostBadge: {
    backgroundColor: '#E5EDDF',
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.primary,
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 6,
    marginLeft: 6,
  },
  memberStatus: {
      fontSize: 12,
      fontWeight: '600',
  }
});