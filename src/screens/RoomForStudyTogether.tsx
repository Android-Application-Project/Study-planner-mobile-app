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
import { doc, onSnapshot, updateDoc, getDoc, arrayUnion, collection, addDoc, serverTimestamp, increment } from 'firebase/firestore';
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
  elephant: 
    { 
      stages: 
      { baby: require('../assets/Animal/BabyElephant.png'), 
        child: require('../assets/Animal/ChildElephant.png'), 
        adult: require('../assets/Animal/AdultElephant.png'), 
        crying: require('../assets/Animal/CryingElephant.png') 
      } 
    },
  crocodile: 
    { 
      stages: 
      { baby: require('../assets/Animal/BabyCrocodile.png'), 
        child: require('../assets/Animal/ChildCrocodile.png'), 
        adult: require('../assets/Animal/AdultCrocodile.png'), 
        crying: require('../assets/Animal/CryingCrocodile.png') 
      } 
    },
  shark: 
  { 
    stages: 
    { 
      baby: require('../assets/Animal/BabyShark.png'), 
      child: require('../assets/Animal/KidShark.png'), 
      adult: require('../assets/Animal/AdultShark.png'), 
      crying: require('../assets/Animal/CryingShark.png') 
    } 
  }
};

const NOTIFICATION_SOUNDS = {
  complete: require('../assets/sounds/complete.mp3'), 
  breakEnd: require('../assets/sounds/breakEnd.mp3'),
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

export default function RoomForStudyTogether() {
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
  const [timeLeft, setTimeLeft] = useState(25 * 60); 
  const [hasCollected, setHasCollected] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [selectedPetId, setSelectedPetId] = useState('elephant');
  const [showCryingPet, setShowCryingPet] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const [selectedSoundId, setSelectedSoundId] = useState('none');

  const [currentMode, setCurrentMode] = useState<'Study' | 'Relax'>('Study');
  const [isRelaxModalVisible, setRelaxModalVisible] = useState(false);
  const [relaxMinutes, setRelaxMinutes] = useState(5);

  const [isChatModalVisible, setChatModalVisible] = useState(false);
  const [isInviteModalVisible, setInviteModalVisible] = useState(false);
  const [isSoundModalVisible, setSoundModalVisible] = useState(false);

  const soundObject = useRef<Audio.Sound | null>(null);
  const timerViewRef = useRef<View>(null);
  const circleCenterRef = useRef({ x: 0, y: 0 });

  const [isHost, setIsHost] = useState(false);

  useEffect(() => {
    if (!roomId || !currentUserId) return;
    const roomRef = doc(db, 'rooms', roomId);
    const unsubRoom = onSnapshot(roomRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setIsHost(data.hostId === currentUserId);
        if (data.hostId !== currentUserId) {
          setCurrentMode(data.currentMode || 'Study');
          setTimeLeft(data.timeLeft ?? 25 * 60);
          setIsActive(data.isActive || false);
          setFocusMinutes(data.focusMinutes || 25); 
        }
      }
    });
    return () => unsubRoom();
  }, [roomId, currentUserId]);

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
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

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
      if (!isActive) return;

      e.preventDefault();
      Alert.alert("Abandon your pet?", "Leaving now will reset progress.", [
        { text: "Stay", style: "cancel" },
        { 
          text: "Leave", 
          style: 'destructive', 
          onPress: () => navigation.dispatch(e.data.action)
        }
      ]);
    });

    return () => unsubNav(); 
  }, [navigation, isActive]);

  useEffect(() => {
    return () => {
      handleExitRoom();
    };
  }, []); 

  const playNotificationSound = async (type: 'complete' | 'breakEnd') => {
    try {
      const soundFile = type === 'complete' ? NOTIFICATION_SOUNDS.complete : NOTIFICATION_SOUNDS.breakEnd;
      const { sound } = await Audio.Sound.createAsync(soundFile);
      await sound.playAsync();
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          sound.unloadAsync();
        }
      });
    } catch (error) {
      console.log("Error playing sound:", error);
    }
  };

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

  useEffect(() => {
    let iv: any = null;
    
    if (isHost && isActive && timeLeft > 0) {
      iv = setInterval(() => {
        const nextValue = timeLeft - 1;
        setTimeLeft(nextValue);
        updateDoc(doc(db, 'rooms', roomId), { timeLeft: nextValue });
      }, 1000);
      
      if (hasCollected) setHasCollected(false);
    } 

    if (isActive && timeLeft === 0 && !hasCollected) {
      setIsActive(false);
      setHasCollected(true);

      if (currentMode === 'Study') {
        (async () => {
          try {
            const roomSnap = await getDoc(doc(db, 'rooms', roomId));
            if (roomSnap.exists()) {
              const roomData = roomSnap.data();
              const startTime = roomData.sessionStartedAt;

              if (startTime) {
                const totalDiffSeconds = Math.floor((Date.now() - startTime) / 1000);
                const targetSeconds = focusMinutes * 60;
                const finalSeconds = (targetSeconds - totalDiffSeconds < 10) ? targetSeconds : totalDiffSeconds;
                
                const earnedCoins = Math.floor(finalSeconds / 60);

                if (earnedCoins > 0) {
                  const userRef = doc(db, 'users', currentUserId!); 
                  await updateDoc(userRef, { coins: increment(earnedCoins) });
                  playNotificationSound('complete');
                  Alert.alert("Goal Reached!", `You earned 🐟 ${earnedCoins} coins!`);
                }
              }
            }
          } catch (e) {
            console.log("領取金幣出錯:", e);
          }
        })();
      } else {
        playNotificationSound('breakEnd');
        if (isHost) updateDoc(doc(db, 'rooms', roomId), { currentMode: 'Study' });
      }

      if (isHost) {
        setTimeout(() => {
          updateDoc(doc(db, 'rooms', roomId), { 
            isActive: false, 
            timeLeft: focusMinutes * 60 
          });
        }, 2000); 
      }
    }

    return () => {
      if (iv) clearInterval(iv);
    };
  }, [isActive, timeLeft, currentMode, isHost, hasCollected]);

  const getCurrentPetImage = () => {
    const pet = (PETS_DATA as any)[selectedPetId] || PETS_DATA.elephant;
    if (showCryingPet) return pet.stages.crying;
    if (currentMode === 'Relax') return pet.stages.baby; 

    const totalSessionSeconds = focusMinutes * 60;
    const progress = timeLeft / (totalSessionSeconds || 1);

    if (progress > 0.7) return pet.stages.baby;  
    if (progress <= 0.2) return pet.stages.adult; 
    return pet.stages.child; 
  };

  const circumference = 2 * Math.PI * RING_CENTER_R;
  const progressRatio = (isActive ? (timeLeft / 60) : focusMinutes) / MAX_MINUTES;
  const strokeDashoffset = circumference * (1 - progressRatio);
  const rad = (((focusMinutes / MAX_MINUTES) * 360) - 90) * (Math.PI / 180);
  const handleX = CIRCLE_RADIUS + RING_CENTER_R * Math.cos(rad);
  const handleY = CIRCLE_RADIUS + RING_CENTER_R * Math.sin(rad);

  const resetFocusSession = async () => {
    setIsActive(false);
    const resetTime = focusMinutes * 60;
    setTimeLeft(resetTime);
    setShowCryingPet(true); 
    setTimeout(() => setShowCryingPet(false), 4000); 
    
    await updateDoc(doc(db, 'rooms', roomId), { 
      isActive: false, 
      timeLeft: resetTime 
    });
  };

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => !isActive && isHost,
    onMoveShouldSetPanResponder: () => !isActive && isHost,
    onPanResponderMove: (evt) => {
      if(!isHost) return;
      const { pageX, pageY } = evt.nativeEvent;
      const { x: cx, y: cy } = circleCenterRef.current;
      
      let angle = Math.atan2(pageX - cx, -(pageY - cy)) * (180 / Math.PI);
      if (angle < 0) angle += 360;
      
      let snapped = Math.round((angle / 360) * 120 / 5) * 5;
      
      if (snapped < 5) snapped = 5;
      if (snapped > 120) snapped = 120;

      setFocusMinutes(snapped); 
      if (currentMode === 'Study') {
        const newSeconds = snapped * 60;
        setTimeLeft(newSeconds);
        
        updateDoc(doc(db, 'rooms', roomId), { 
          focusMinutes: snapped, 
          timeLeft: newSeconds 
        });
      }
    },
  }), [isActive, isHost]);

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
          <View style={styles.modeToggleContainer}>
            <TouchableOpacity 
              style={[styles.modeTab, currentMode === 'Study' && styles.activeModeTab]}
              onPress={() => {
                if (!isHost) { Alert.alert("Notice", "Only the host can switch modes."); return; }
                
                if (currentMode === 'Study' && isActive) {
                  Alert.alert("Reset Focus?", "Switching now will clear progress for everyone and you won't get any coins!", [
                    { text: "Keep Focusing", style: "cancel" },
                    { text: "Reset Anyway", style: 'destructive', onPress: resetFocusSession }
                  ]);
                } else {
                  const newSeconds = focusMinutes * 60;
                  setCurrentMode('Study');
                  setIsActive(false);
                  setTimeLeft(newSeconds);
                  updateDoc(doc(db, 'rooms', roomId), { currentMode: 'Study', isActive: false, timeLeft: newSeconds });
                }
              }}
            >
              <MaterialCommunityIcons 
                name="book-open-variant" 
                size={18} 
                color={currentMode === 'Study' ? '#FFF' : theme.colors.text2} 
              />
              <Text style={[styles.modeTabText, currentMode === 'Study' && styles.activeModeTabText]}>Focus</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.modeTab, currentMode === 'Relax' && styles.activeModeTab]}
              onPress={() => {
                if (!isHost) { Alert.alert("Notice", "Only the host can switch modes."); return; }

                if (currentMode === 'Study' && isActive) {
                  Alert.alert("Switch to Relax?", "Switching now will reset focus progress and you won't get any coins!", [
                    { text: "Keep Focusing", style: "cancel" },
                    { text: "Switch Anyway", style: 'destructive', onPress: () => setRelaxModalVisible(true) }
                  ]);
                } else {
                  setRelaxModalVisible(true);
                }
              }}
            >
              <MaterialCommunityIcons 
                name="coffee" 
                size={18} 
                color={currentMode === 'Relax' ? '#FFF' : theme.colors.text2} 
              />
              <Text style={[styles.modeTabText, currentMode === 'Relax' && styles.activeModeTabText]}>Relax</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity 
            style={[styles.playButton, !isHost && { backgroundColor: '#CCC' }]} 
            onPress={() => {
              if (!isHost) return; 

              if (isActive && currentMode === 'Study') {
                Alert.alert("Abandon Focus?", "Stopping now will reset coins for everyone in this session! 😭", [
                  { text: "Stay Focused", style: "cancel" },
                  { text: "Quit", style: 'destructive', onPress: resetFocusSession }
                ]);
              } else {
                const nextState = !isActive;
                const updateData: any = { isActive: nextState };
                if (nextState && currentMode === 'Study') {
                  updateData.sessionStartedAt = Date.now();
                }
                setIsActive(nextState);
                updateDoc(doc(db, 'rooms', roomId), updateData);
              }
            }}
            disabled={!isHost}
          >
            <Ionicons name={isActive ? "pause" : "play"} size={24} color="#FFF" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.membersSection}>
        <View style={styles.membersHeader}>
          <Text style={styles.membersTitle}>Roommates ({activeUsers.length})</Text>
          <View style={{ flexDirection: 'row' }}>
            <TouchableOpacity style=
              {
                  [styles.chatBtn, {
                  marginRight: 8, 
                  backgroundColor: '#E0F2FE'
                }]
              } onPress={() => setInviteModalVisible(true)}>
              <Feather name="user-plus" size={20} color="#0284c7" />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.chatBtn} 
              onPress={() => { setChatModalVisible(true); setHasUnread(false); }}>
                <Feather 
                  name="message-circle" 
                  size={20} 
                  color={theme.colors.text1} 
                />{hasUnread && <View style={styles.unreadBadge} />}
              </TouchableOpacity>
          </View>
        </View>
        <FlatList data={activeUsers} keyExtractor={item => item.id} renderItem={({item}) => (
          <View style={styles.mateCard}>
            <ProfileAvatar avatar={item.avatar} size={40} bgColor="#F3F4F6" />
            <View style={[styles.mateInfo, {marginLeft: 12}]}><Text style={styles.mateName}>{item.name} {item.id === currentUserId && '(You)'}</Text><Text style={styles.mateSub}>{item.status}</Text></View>
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
                <View 
                  key={index} 
                  style={{ alignSelf: msg.senderId === currentUserId ? 'flex-end' : 'flex-start', 
                  backgroundColor: msg.senderId === currentUserId ? theme.colors.primary : '#EEE', padding: 12, borderRadius: 18, marginBottom: 8, maxWidth: '80%' 
                }}>
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

      <Modal visible={isSoundModalVisible} animationType="fade" transparent>
        <Pressable style={styles.modalOverlay} onPress={() => setSoundModalVisible(false)}>
          <View style={styles.modalContent}><View style={styles.modalHandle} /><Text style={styles.modalTitle}>Ambient Sounds</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
              {AMBIENT_SOUNDS.map((s) => (
                <TouchableOpacity 
                  key={s.id} 
                  style={
                    { 
                      width: '48%', 
                      backgroundColor: selectedSoundId === s.id ? 
                      theme.colors.primary : '#F3F4F6', 
                      padding: 15, 
                      borderRadius: 20, 
                      alignItems: 'center', 
                      marginBottom: 15, 
                      flexDirection: 'row', 
                      justifyContent: 'center' 
                    }
                  } onPress={() => playAmbientSound(s.id)}>
                  <MaterialCommunityIcons name={s.icon as any} size={20} color={selectedSoundId === s.id ? '#FFF' : theme.colors.text2} style={{ marginRight: 8 }} />
                  <Text style={{ fontWeight: 'bold', color: selectedSoundId === s.id ? '#FFF' : theme.colors.text1 }}>{s.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={styles.confirmBtn} onPress={() => setSoundModalVisible(false)}><Text style={{ color: '#FFF', fontWeight: 'bold' }}>Close</Text></TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      <Modal visible={isRelaxModalVisible} animationType="fade" transparent>
        <Pressable style={styles.modalOverlay} onPress={() => setRelaxModalVisible(false)}>
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Take a Break</Text>
            <View style={styles.settingRow}>
              <Text style={styles.label}>Relax Duration</Text>
              <View style={styles.stepper}>
                <TouchableOpacity onPress={() => setRelaxMinutes(Math.max(1, relaxMinutes - 1))}><Feather name="minus" size={20}/></TouchableOpacity>
                <Text style={styles.stepVal}>{relaxMinutes}m</Text>
                <TouchableOpacity onPress={() => setRelaxMinutes(relaxMinutes + 1)}><Feather name="plus" size={20}/></TouchableOpacity>
              </View>
            </View>
            <TouchableOpacity 
              style={styles.confirmBtn} 
              onPress={() => {
                const newSeconds = relaxMinutes * 60;
                setCurrentMode('Relax');
                setTimeLeft(newSeconds);
                setIsActive(true);
                setRelaxModalVisible(false);
                updateDoc(doc(db, 'rooms', roomId), { 
                  currentMode: 'Relax', 
                  timeLeft: newSeconds, 
                  isActive: true 
                });
              }}
            >
              <Text style={{color:'#FFF', fontWeight:'bold'}}>Start Resting</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const formatTime = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

const createStyles = (theme: Theme) => StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: theme.colors.background 
  },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 20, 
    height: 60 
  },
  backBtn: { 
    padding: 8, 
    backgroundColor: theme.colors.card, 
    borderRadius: 12 
  },
  roomHeaderTitle: { 
    fontSize: 18, 
    fontWeight: '800', 
    color: theme.colors.text1 
  },
  headerIcon: { 
    padding: 8, 
    backgroundColor: theme.colors.card, 
    borderRadius: 12 
  },
  timerSection: { 
    alignItems: 'center', 
    marginTop: 10 
  },
  timerContainer: { 
    width: CIRCLE_SIZE, 
    height: CIRCLE_SIZE, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  timerInner: { 
    position: 'absolute', 
    alignItems: 'center' 
  },
  timeTextSmall: { 
    fontSize: 26, 
    fontWeight: 'bold', 
    color: theme.colors.text1, 
    marginTop: 5 
  },
  sliderHandle: { 
    position: 'absolute', 
    width: HANDLE_SIZE, 
    height: HANDLE_SIZE, 
    borderRadius: HANDLE_SIZE/2, 
    backgroundColor: '#FFF', 
    borderWidth: 4, 
    borderColor: theme.colors.primary, 
    elevation: 5 
  },
  controlRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginTop: 20, 
    width: '90%', 
    justifyContent: 'space-between' 
  },
  summaryBadge: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#FFF', 
    padding: 12, 
    borderRadius: 20, 
    flex: 1, 
    marginRight: 15, 
    elevation: 2 
  },
  summaryText: { 
    fontSize: 13, 
    fontWeight: '700', 
    color: theme.colors.text1, 
    marginRight: 10 
  },
  playButton: { 
    width: 50, 
    height: 50, 
    borderRadius: 25, 
    backgroundColor: theme.colors.primary, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  membersSection: { 
    flex: 1, 
    backgroundColor: '#FFF', 
    borderTopLeftRadius: 35, 
    borderTopRightRadius: 35, 
    padding: 20, 
    marginTop: 20, 
    elevation: 10, 
    marginBottom: -100, 
    paddingBottom: 120, 
  },
  membersHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 15 
  },
  membersTitle: { 
    fontSize: 16, 
    fontWeight: '800', 
    color: theme.colors.text1 
  },
  chatBtn: { 
    padding: 10, 
    backgroundColor: '#F3F4F6', 
    borderRadius: 12, 
    position: 'relative' 
  },
  unreadBadge: { 
    position: 'absolute', 
    top: -2, 
    right: -2, 
    width: 10, 
    height: 10, 
    borderRadius: 5, 
    backgroundColor: '#EF4444', 
    borderWidth: 1.5, 
    borderColor: '#FFF' 
  },
  mateCard: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 10, 
    backgroundColor: '#F9FAFB', 
    padding: 12, 
    borderRadius: 15 
  },
  mateInfo: { 
    flex: 1 
  },
  mateName: { 
    fontSize: 14, 
    fontWeight: '700', 
    color: theme.colors.text1 
  },
  mateSub: { 
    fontSize: 12, 
    color: theme.colors.text2 
  },
  mateTimeBox: { 
    backgroundColor: '#E5EDDF', 
    padding: 6, 
    borderRadius: 10 
  },
  mateTimeText: { 
    fontSize: 13, 
    fontWeight: 'bold', 
    color: theme.colors.primary 
  },
  modalOverlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.5)', 
    justifyContent: 'flex-end' 
  },
  modalContent: { 
    backgroundColor: '#FFF', 
    padding: 25, 
    borderTopLeftRadius: 30, 
    borderTopRightRadius: 30 
  },
  modalHandle: { 
    width: 40, 
    height: 5, 
    backgroundColor: '#DDD', 
    borderRadius: 5, 
    alignSelf: 'center', 
    marginBottom: 15 
  },
  modalTitle: { 
    fontSize: 20, 
    fontWeight: 'bold', 
    marginBottom: 20, 
    textAlign: 'center', 
    color: theme.colors.text1 
  },
  quickChatSection: { 
    borderTopWidth: 1, 
    borderColor: '#EEE', 
    paddingTop: 15 
  },
  emojiRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-around', 
    marginBottom: 20 
  },
  textMsgGrid: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    justifyContent: 'center' 
  },
  quickMsgBtn: { 
    backgroundColor: '#F3F4F6', 
    paddingHorizontal: 15, 
    paddingVertical: 10, 
    borderRadius: 20, 
    margin: 5 
  },
  quickMsgText: { 
    fontSize: 13, 
    fontWeight: '600', 
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
  label: { 
    fontSize: 16, 
    fontWeight: '700', 
    color: theme.colors.text1 
  },
  subLabel: { 
    fontSize: 12, 
    color: '#999' 
  },
  stepper: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#F3F4F6', 
    padding: 5, borderRadius: 15 
  },
  stepVal: { 
    fontSize: 16, 
    fontWeight: '800', 
    width: 55, 
    textAlign: 'center' 
  },
  confirmBtn: { 
    backgroundColor: theme.colors.primary, 
    padding: 15, 
    borderRadius: 20, 
    alignItems: 'center' 
  },

  modeToggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 25,
    padding: 4,
    flex: 1,
    marginRight: 15,
    height: 50,
    alignItems: 'center',
  },
  modeTab: {
    flex: 1,
    flexDirection: 'row',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 21,
  },
  activeModeTab: {
    backgroundColor: theme.colors.primary,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
  },
  modeTabText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.text2,
  },
  activeModeTabText: {
    color: '#FFF',
  },
});