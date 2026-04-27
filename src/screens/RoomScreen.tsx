import { StyleSheet, Text, View, TouchableOpacity, FlatList, Modal, TextInput, Pressable, KeyboardAvoidingView, Platform, ScrollView, Image, Alert, Switch } from 'react-native'
import React, { useState, useMemo, useEffect } from 'react'
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context'
import SegmentedControl from '../components/SegmentedControl'
import FriendScreen from './FriendScreen'
import { Feather } from '@expo/vector-icons'; 

import { useTheme } from '../utils/ThemeContext';
import { Theme } from '../utils/Themes';

import { collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, doc, where, getDoc, updateDoc, increment, arrayUnion, deleteDoc } from 'firebase/firestore';
import { db, auth } from '../../firebaseConfig';

export default function RoomScreen() {
    const navigation = useNavigation<any>();
    const { theme } = useTheme();
    const styles = useMemo(() => createStyles(theme), [theme]);

    const currentUserId = auth.currentUser?.uid; 

    const [index, setIndex] = useState(0);
    const [filterType, setFilterType] = useState<'All' | 'Mine' | 'Friends'>('All');

    const [isModalVisible, setModalVisible] = useState(false);
    const [newRoomName, setNewRoomName] = useState(''); 
    const [maxMembers, setMaxMembers] = useState(4); 
    const [isLocked, setIsLocked] = useState(false);
    const [roomPassword, setRoomPassword] = useState('');

    const [selectedSubjects, setSelectedSubjects] = useState<string[]>(['Math']); 
    const [customSubject, setCustomSubject] = useState('');
    const [showCustomInput, setShowCustomInput] = useState(false)
    const [roomMode, setRoomMode] = useState<'Shared' | 'Independent'>('Shared'); 

    const [focusTime, setFocusTime] = useState(25);
    const [breakTime, setBreakTime] = useState(5);
    const [sessions, setSessions] = useState(4);

    const memberOptions = [2, 4, 6, 8, 10, 12]; 

    const [rooms, setRooms] = useState<any[]>([]);

    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [inputPassword, setInputPassword] = useState('');
    const [pendingRoom, setPendingRoom] = useState<any>(null);

    const [notifications, setNotifications] = useState<any[]>([]);
    const [isNotifModalVisible, setIsNotifModalVisible] = useState(false);

    useEffect(() => {
      if(!db || !currentUserId) return;

      let unsubscribeRooms: any = null;

      const myRef = doc(db, 'users', currentUserId);
      const unsubscribeMe = onSnapshot(myRef, (docSnap) => {
        if (docSnap.exists()){
          const myData = docSnap.data();
          const myFriendIds = myData.friendIds || [];

          const targetIds = [...myFriendIds, currentUserId];
          const safeTargetIds = targetIds.slice(0, 30);

          const roomsRef = collection (db, 'rooms');
          const q = query(
            roomsRef,
            where('hostId', 'in', safeTargetIds),
            orderBy('createdAt', 'desc')
          );

          if(unsubscribeRooms) unsubscribeRooms();

          unsubscribeRooms = onSnapshot(q, (snapshot) => {
            const fetchedRooms = snapshot.docs.map (d => ({
              id: d.id,
              ...d.data ()
            }));
            setRooms(fetchedRooms);
          });
        }
      });
      return () => {
        unsubscribeMe();
        if (unsubscribeRooms) unsubscribeRooms();
      }
    }, [currentUserId]);

    useEffect(() => {
      if(!db || !currentUserId) return;

      const notifRef = collection(db, 'notifications');
      const q = query(
        notifRef,
        where('receiverId', '==', currentUserId),
        where('status', '==', 'unread')
      );

      const unsubscribeNotifs = onSnapshot(q, (snapshot) => {
        const fetchedNotifs = snapshot.docs.map(d => ({
          id: d.id,
          ...d.data()
        }));

        fetchedNotifs.sort((a: any, b: any) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
        setNotifications(fetchedNotifs);
      });

      return () => unsubscribeNotifs();
    },[currentUserId]);

    const filteredRooms = useMemo(() => {
      if (filterType === 'Mine') {
        return rooms.filter(r => r.hostId === currentUserId);
      } else if (filterType === 'Friends') {
        return rooms.filter(r => r.hostId !== currentUserId);
      }
      return rooms; 
    }, [rooms, filterType, currentUserId]);

    const toggleSubject = (subject: string) => {
      setSelectedSubjects([subject]);
      setCustomSubject('');
      setShowCustomInput(false);
    };

    const handleCustomSubjectChange = (text: string) => {
      setCustomSubject(text);
      if (text.trim() !== ''){
        setSelectedSubjects([]);
      }
    }

    const handleCreateRoom = async () => {
      if (newRoomName.trim() === '') {
        alert("Please enter a room name!"); 
        return;
      }

      if (isLocked && roomPassword.trim() === '') {
        alert("Please enter a password for this private room.");
        return;
      }

      if(!currentUserId){
        alert("Error, cant find user ID, please login again");
        return;
      }

      
      try {
        const userRef = doc(db, 'users', currentUserId);
        const userSnap = await getDoc(userRef);
        const userData = userSnap.exists() ? userSnap.data() : {};
        const myAvatar = userData.avatar || '👤';
        const myName = userData.name || userData.username || 'Unknown';

        const roomsRef = collection(db, 'rooms');

        await addDoc(roomsRef, {
          name: newRoomName,
          members: 1, 
          max: maxMembers,
          mode: roomMode,
          focusTime: focusTime,
          breakTime: breakTime,
          sessions: sessions,
          isLocked: isLocked,
          password: isLocked ? roomPassword.trim() : '',
          createdAt: serverTimestamp(),
          hostId: currentUserId,
          hostAvatar: myAvatar,
          hostName: myName,
          activeUsers: [{
            id: currentUserId,
            name: myName,
            avatar: myAvatar,
            isHost: true
          }]
        });

        setModalVisible(false);
        setNewRoomName('');
        setMaxMembers(4);
        setRoomMode('Shared');
        setFocusTime(25); 
        setBreakTime(5);  
        setSessions(4);
        setCustomSubject('');
        setShowCustomInput(false);
        setIsLocked(false);
        setRoomPassword('');
        
        setFilterType('All');

      } catch (error) {
        console.error("Error creating room: ", error);
        alert("create room failed");
      }
    };

    const handleDeleteRoom = (roomId: string, roomName: string) => {
      Alert.alert(
        "Delete Room",
        `Are you sure you want to delete "${roomName}"?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: async () => {
              try {
                await deleteDoc(doc(db, 'rooms', roomId));
              } catch (error) {
                console.error("Error deleting room: ", error);
                Alert.alert("Error", "Could not delete the room.");
              }
            }
          }
        ]
      );
    };

    const initiateJoin = (item: any) => {
      const isAlreadyInRoom = item.activeUsers?.some((u: any) => u.id === currentUserId);
      
      if (item.hostId === currentUserId || isAlreadyInRoom || !item.isLocked) {
        handleJoinRoom(item);
      } else {
        setPendingRoom(item);
        setInputPassword('');
        setShowPasswordModal(true);
      }
    };

    const confirmPasswordAndJoin = () => {
      if (inputPassword === pendingRoom?.password) {
        setShowPasswordModal(false);
        handleJoinRoom(pendingRoom);
      } else {
        Alert.alert("Incorrect Password", "Please try again.");
      }
    };

    const handleJoinRoom = async (item: any) => {
      const isAlreadyInRoom = item.activeUsers?.some((u: any) => u.id === currentUserId);
      const currentCount = item.activeUsers?.length || 0;

      if (!isAlreadyInRoom && currentCount >= item.max) {
        return Alert.alert("Room is full", "Please try another room.");
      }

      if (!isAlreadyInRoom) {
        try {
          const userSnap = await getDoc(doc(db, 'users', currentUserId!));
          const userData = userSnap.exists() ? userSnap.data() : {};
          const roomRef = doc(db, 'rooms', item.id);
          
          await updateDoc(roomRef, {
            activeUsers: arrayUnion({
              id: currentUserId,
              name: userData.name || userData.username || 'Buddy',
              avatar: userData.avatar || '👤',
              isHost: currentUserId === item.hostId
            }),
            members: currentCount + 1
          });
        } catch (error) {
          console.error("Join Room Error:", error);
          return;
        }
      }

      if (item.mode === 'Shared') {
        navigation.navigate('RoomForStudyTogether', { 
          roomId: item.id, 
          roomName: item.name 
        });
      } else {
        navigation.navigate('RoomForIndependentStudy', { 
          roomId: item.id, 
          roomName: item.name 
        });
      }
    };

    const handleAcceptInvite = async (notif: any) => {
      try {
        const notifDoc = doc(db, 'notifications', notif.id);
        await updateDoc(notifDoc, { status: 'read'});

        setIsNotifModalVisible(false);

        const roomToJoin = rooms.find(r => r.id === notif.roomId);
        if(roomToJoin){
          handleJoinRoom(roomToJoin);
        }else {
          const roomSnap = await getDoc(doc(db, 'rooms', notif.roomId));
          if (roomSnap.exists()){
            const rData = { id: roomSnap.id, ...roomSnap.data() };
            handleJoinRoom(rData);
          } else {
            Alert.alert("Oops", "This room has been closed or no longer exists.");
          }
        } 
      } catch (error) {
        console.error("Error accepting invite:", error);
      }
    };

    const handleDeclineInvite = async (notif: any) => {
      try {
        const notifDoc = doc(db, 'notifications', notif.id);
        await updateDoc(notifDoc, { status: 'read' });
      } catch (error) {
        console.error("Error declining invite:", error);
      }
    };

    const renderRoomCard = ({ item }: any) => {
        const isHost = item.hostId === currentUserId;
        
        const currentPeople = item.activeUsers?.length || 0;
        const isFull = currentPeople >= item.max;

        return (
          <View style={styles.roomCard}>
            <View style={styles.cardContentSection}>
              <View style={styles.roomIconBg}>
                {item.hostAvatar && item.hostAvatar.startsWith('http') ? (
                  <Image source={{ uri: item.hostAvatar }} style={{ width: 50, height: 50, borderRadius: 25 }} />
                ) : (
                  <Text style={styles.roomIcon}>{item.hostAvatar || '👤'}</Text>
                )}
              </View>
              
              <View style={styles.roomInfoColumn}>
                <View style={styles.roomNameRow}>
                  <Text style={styles.roomName} numberOfLines={1}>{item.name}</Text>
                  {item.isLocked && (
                    <Feather name="lock" size={14} color={theme.colors.text2} style={{ marginLeft: 6 }} />
                  )}
                </View>

                <View style={styles.roomMetaRow}>
                  
                  <View style={[
                    styles.modePill, 
                    item.mode === 'Independent' && styles.modePillIndependent
                  ]}>
                     <Feather 
                        name={item.mode === 'Shared' ? 'users' : 'headphones'} 
                        size={12} 
                        color={item.mode === 'Shared' ? theme.colors.primary : '#F59E0B'} 
                        style={{ marginRight: 4 }} 
                     />
                     <Text style={[
                        styles.modePillText, 
                        item.mode === 'Independent' && { color: '#F59E0B' }
                     ]}>
                        {item.mode}
                     </Text>
                  </View>
                </View>
              </View>

              {isHost && (
                <TouchableOpacity 
                  style={styles.deleteRoomBtn} 
                  onPress={() => handleDeleteRoom(item.id, item.name)}
                >
                  <Feather name="trash-2" size={18} color="#EF4444" />
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.cardActionSection}>
              <Text style={[
                styles.cardActionDetail,
                isFull && { color: '#EF4444' } 
              ]}>
                   {currentPeople}/{item.max} {isFull ? 'Full' : 'Joined'}
              </Text>

              <TouchableOpacity 
                style={[
                  styles.joinButton,
                  isFull && { backgroundColor: '#D1D5DB' }
                ]}
                activeOpacity={0.8}
                onPress={() => initiateJoin(item)}
              >
                <Text style={styles.joinButtonText}>
                  {isFull ? 'Full' : 'Join'}
                </Text>
              </TouchableOpacity>
            </View>
          </View> 
        );
    };

    const renderNotification = ({ item }: any) => (
      <View style = {styles.notifCard}>
        <View style = {styles.notifInfo}>
          <Feather name = 'mail' size = {20} color = {theme.colors.primary} style = {{ marginRight: 10}} />
          <View style = {{ flex: 1 }}>
            <Text style = {styles.notifText}>
              <Text 
                style={
                  { 
                    fontWeight: 'bold' 
                  }
                }>{
                  item.senderName}
              </Text> invited you to join <Text style={{ fontWeight: 'bold' }}>{item.roomName}</Text>!
            </Text>
          </View>
        </View>

        <View style = {styles.notifActions}>
          <TouchableOpacity style={styles.declineBtn} onPress={() => handleDeclineInvite(item)}>
            <Text style={styles.declineBtnText}>Decline</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.acceptBtn} onPress={() => handleAcceptInvite(item)}>
            <Text style={styles.acceptBtnText}>Join</Text>
          </TouchableOpacity>
        </View>
      </View>
    )

    let studyTogetherContent = (
      <View style={styles.contentArea}>
        
        <View style={styles.subHeader}>
          <Text style={styles.sectionTitle}>Available Rooms</Text>
          <View style={styles.headerRightActions}>
            <TouchableOpacity style={styles.bellButton} onPress={() => setIsNotifModalVisible(true)}>
              <Feather name="bell" size={24} color={theme.colors.text1} />
              {notifications.length > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{notifications.length}</Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.createButton} onPress={() => setModalVisible(true)}>
              <Feather name="plus" size={20} color="#FFF" />
              <Text style={styles.createButtonText}>Create</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.filterRow}>
          {['All', 'Mine', 'Friends'].map(type => (
            <TouchableOpacity
              key={type}
              style={[styles.filterPill, filterType === type && styles.filterPillActive]}
              onPress={() => setFilterType(type as any)}
            >
              <Text style={[styles.filterPillText, filterType === type && styles.filterPillTextActive]}>
                {type === 'Mine' ? 'My Rooms' : type === 'Friends' ? "Friends' Rooms" : 'All Rooms'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <FlatList
          data={filteredRooms}
          keyExtractor={item => item.id}
          renderItem={renderRoomCard}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', marginTop: 50 }}>
              <Feather name="inbox" size={40} color="#D1D5DB" style={{marginBottom: 10}}/>
              <Text style={{ color: theme.colors.text2, fontSize: 16 }}>No rooms found.</Text>
            </View>
          }
        />

        <Modal animationType="slide" transparent={true} visible={isModalVisible} onRequestClose={() => setModalVisible(false)}>
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
            style={{ flex: 1 }}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Create room</Text>
                  <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeIconBtn}>
                    <Feather name="x" size={24} color={theme.colors.text1} />
                  </TouchableOpacity>
                </View>
                
                <View style={styles.scrollContainerWrapper}>
                  <ScrollView 
                    showsVerticalScrollIndicator={false} 
                    contentContainerStyle={{ paddingBottom: 40 }}
                    keyboardShouldPersistTaps="handled" 
                  >
                    <Text style={styles.inputLabel}>Room name</Text>
                    <TextInput
                      style={styles.modalInput}
                      placeholder="e.g. Late Night Study"
                      placeholderTextColor={theme.colors.text2}
                      value={newRoomName}
                      onChangeText={setNewRoomName}
                    />

                    <View style={styles.settingRow}>
                      <View>
                          <Text style={styles.inputLabel}>Private Room</Text>
                          <Text style={styles.helperText}>Require a password to join</Text>
                      </View>
                      <Switch 
                        value={isLocked} 
                        onValueChange={setIsLocked} 
                        trackColor={{ false: '#D1D5DB', true: theme.colors.primary }}
                      />
                    </View>

                    {isLocked && (
                      <TextInput
                        style={styles.modalInput}
                        placeholder="Enter room password"
                        placeholderTextColor={theme.colors.text2}
                        secureTextEntry
                        value={roomPassword}
                        onChangeText={setRoomPassword}
                      />
                    )}

                    <Text style={styles.inputLabel}>Study Mode</Text>
                    <View style={styles.modeSelectionContainer}>
                      <TouchableOpacity 
                          style={[styles.modeOption, roomMode === 'Shared' && styles.modeOptionActive]}
                          onPress={() => setRoomMode('Shared')}
                      >
                          <Feather name="users" size={24} color={roomMode === 'Shared' ? theme.colors.primary : theme.colors.text2} />
                          <Text style={[styles.modeOptionTitle, roomMode === 'Shared' && {color: theme.colors.primary}]}>Shared</Text>
                      </TouchableOpacity>

                      <TouchableOpacity 
                          style={[styles.modeOption, roomMode === 'Independent' && styles.modeOptionActive]}
                          onPress={() => setRoomMode('Independent')}
                      >
                          <Feather name="headphones" size={24} color={roomMode === 'Independent' ? theme.colors.primary : theme.colors.text2} />
                          <Text style={[styles.modeOptionTitle, roomMode === 'Independent' && {color: theme.colors.primary}]}>Independent</Text>
                      </TouchableOpacity>
                    </View>

                    <Text style={styles.inputLabel}>Max members</Text>
                    <View style={styles.circleOptionsContainer}>
                      {memberOptions.map((num) => {
                        const isSelected = maxMembers === num;
                        return (
                          <TouchableOpacity 
                            key={num}
                            style={[styles.circleButton, isSelected && { backgroundColor: theme.colors.primary }]}
                            onPress={() => setMaxMembers(num)}
                          >
                            <Text style={[styles.circleButtonText, isSelected && { color: '#FFF' }]}>{num}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>

                    {showCustomInput && (
                      <TextInput
                        style = { styles.customSubjectInput}
                        placeholder='Type the subject...'
                        placeholderTextColor={ theme.colors.text2 }
                        value = {customSubject}
                        onChangeText = {handleCustomSubjectChange}
                        maxLength = {15}
                        autoFocus = {true}
                      />
                    )}

                    <View style={styles.modalActions}>
                      <TouchableOpacity style={styles.cancelButton} onPress={() => setModalVisible(false)}>
                        <Text style={styles.cancelButtonText}>Cancel</Text>
                      </TouchableOpacity>
                      
                      <TouchableOpacity 
                        style={styles.confirmButton} 
                        onPress={handleCreateRoom}
                      >
                        <Text style={styles.confirmButtonText}>Create</Text>
                      </TouchableOpacity>
                    </View>
                  </ScrollView>
                </View>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        <Modal animationType="fade" transparent={true} visible={showPasswordModal} onRequestClose={() => setShowPasswordModal(false)}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
            <Pressable style={styles.modalOverlayJoin} onPress={() => setShowPasswordModal(false)}>
              <Pressable style={styles.modalContentJoin} onPress={(e) => e.stopPropagation()}>
                <View style={styles.modalHandle} />
                <View style={{alignItems: 'center', marginBottom: 20}}>
                  <Feather name="lock" size={40} color={theme.colors.primary} style={{marginBottom: 15}} />
                  <Text style={styles.modalTitle}>Private Room</Text>
                  <Text style={styles.modalSubtitle}>Please enter the password to join.</Text>
                </View>

                <TextInput
                  style={styles.modalInput}
                  placeholder="Password"
                  placeholderTextColor={theme.colors.text2}
                  secureTextEntry
                  value={inputPassword}
                  onChangeText={setInputPassword}
                  autoFocus
                />

                <View style={styles.modalActions}>
                  <TouchableOpacity style={styles.cancelButton} onPress={() => setShowPasswordModal(false)}>
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.confirmButton} onPress={confirmPasswordAndJoin}>
                    <Text style={styles.confirmButtonText}>Join</Text>
                  </TouchableOpacity>
                </View>
              </Pressable>
            </Pressable>
          </KeyboardAvoidingView>
        </Modal>

        <Modal animationType="fade" transparent={true} visible={isNotifModalVisible} onRequestClose={() => setIsNotifModalVisible(false)}>
          <View style={styles.modalOverlayJoin}>
            <View style={[styles.modalContentJoin, { height: '60%', paddingHorizontal: 20 }]}>
              <View style={styles.notifModalHeader}>
                <Text style={styles.modalTitle}>Invitations</Text>
                <TouchableOpacity onPress={() => setIsNotifModalVisible(false)}>
                  <Feather name="x" size={24} color={theme.colors.text1} />
                </TouchableOpacity>
              </View>

              <FlatList
                data={notifications}
                keyExtractor={item => item.id}
                renderItem={renderNotification}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                  <View style={{ alignItems: 'center', marginTop: 40 }}>
                    <Feather name="bell-off" size={40} color="#D1D5DB" style={{ marginBottom: 10 }} />
                    <Text style={{ color: theme.colors.text2, fontSize: 16 }}>No new invitations</Text>
                  </View>
                }
              />
            </View>
          </View>
        </Modal>
      </View>
    );

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.segmentWrapper}>
            <SegmentedControl
                values={['Study together', 'Friends']}
                selectedIndex={index}
                onChange={setIndex}
            />
        </View>
        {index === 0 ? studyTogetherContent : <FriendScreen/>}
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const createStyles = (theme: Theme) => StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: theme.colors.background 
  },
  segmentWrapper: { 
    marginTop: 20, 
    marginBottom: 15 
  },
  contentArea: { 
    flex: 1 
  },
  
  subHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 25, 
    marginBottom: 15, 
    marginTop: 5 
  },

  sectionTitle: { 
    fontSize: 22, 
    fontWeight: '800', 
    color: theme.colors.text1 
  },

  headerRightActions: { 
      flexDirection: 'row', 
      alignItems: 'center' 
    },
  bellButton: { 
    position: 'relative', 
    marginRight: 18, 
    padding: 5 
  },
  badge: { 
    position: 'absolute', 
    top: 0, 
    right: 0, 
    backgroundColor: '#EF4444', 
    width: 18, 
    height: 18, 
    borderRadius: 9, 
    justifyContent: 'center', 
    alignItems: 'center', 
    borderWidth: 2, 
    borderColor: theme.colors.background 
  },
  badgeText: { 
    color: '#FFF', 
    fontSize: 10, 
    fontWeight: 'bold' 
  },
  notifModalHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 20 
  },
  notifCard: { 
    backgroundColor: '#FFF', 
    padding: 15, 
    borderRadius: 15, 
    marginBottom: 12, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.05, 
    shadowRadius: 5, 
    elevation: 2 
  },
  notifInfo: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 12 
  },
  notifText: { 
    fontSize: 15, 
    color: theme.colors.text1, 
    lineHeight: 22 
  },
  notifActions: { 
    flexDirection: 'row', 
    justifyContent: 'flex-end' 
  },
  declineBtn: { 
    paddingVertical: 8, 
    paddingHorizontal: 15, 
    borderRadius: 15, 
    backgroundColor: '#F3F4F6', 
    marginRight: 10 
  },
  declineBtnText: { 
    color: theme.colors.text2, 
    fontWeight: 'bold', 
    fontSize: 13 
  },
  acceptBtn: { 
    paddingVertical: 8, 
    paddingHorizontal: 15, 
    borderRadius: 15, 
    backgroundColor: theme.colors.primary 
  },
  acceptBtnText: { 
    color: '#FFF', 
    fontWeight: 'bold', 
    fontSize: 13 
  },

  createButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: theme.colors.primary, 
    paddingVertical: 8, 
    paddingHorizontal: 15, 
    borderRadius: 20 
  },

  createButtonText: { 
    color: '#FFF', 
    fontWeight: 'bold', 
    marginLeft: 5, 
    fontSize: 14 
  },

  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 25,
    marginBottom: 20,
  },
  filterPill: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#E5E7EB',
    borderRadius: 20,
    marginRight: 10,
  },
  filterPillActive: {
    backgroundColor: theme.colors.text1,
  },
  filterPillText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.text2,
  },
  filterPillTextActive: {
    color: '#FFF',
  },

  listContent: { 
    paddingHorizontal: 25, 
    paddingBottom: 40 
  },
  
  roomCard: { 
    backgroundColor: '#FFFFFF', 
    borderRadius: 24, 
    marginBottom: 16, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.05, 
    shadowRadius: 8, 
    elevation: 3, 
    overflow: 'hidden', 
  },

  cardContentSection: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 18, 
    paddingHorizontal: 20,
  },

  roomIconBg: { 
    width: 50, 
    height: 50, 
    borderRadius: 25, 
    backgroundColor: '#E5EDDF', 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginRight: 15 
  },

  roomIcon: { 
    fontSize: 28 
  },

  roomInfoColumn: { 
    flex: 1, 
    justifyContent: 'center' 
  },

  roomNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6
  },

  roomName: { 
    fontSize: 18,
    fontWeight: '800', 
    color: theme.colors.text1, 
  },

  roomMetaRow: { 
    flexDirection: 'row', 
    alignItems: 'center' 
  },
  
  miniPill: { 
    backgroundColor: theme.colors.card, 
    paddingVertical: 5, 
    paddingHorizontal: 10, 
    borderRadius: 12, 
    marginRight: 8, 
  },
  miniPillText: { 
    fontSize: 12, 
    fontWeight: '700', 
    color: theme.colors.primary, 
  },
  modePill: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#E5EDDF', 
    paddingVertical: 5, 
    paddingHorizontal: 10, 
    borderRadius: 12, 
    marginRight: 8 
  },

  modePillIndependent: { 
    backgroundColor: '#FEF3C7' 
  }, 

  modePillText: { 
    fontSize: 12, 
    fontWeight: '700', 
    color: theme.colors.primary 
  },

  deleteRoomBtn: {
    padding: 8,
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
    marginLeft: 10,
  },

  cardActionSection: { 
    flexDirection: 'row', 
    justifyContent: 'space-between',
    alignItems: 'center', 
    backgroundColor: '#F7F9F5',
    paddingVertical: 12, 
    paddingHorizontal: 20,
    borderTopWidth: 1, 
    borderTopColor: '#F0F2ED', 
  },

  cardActionDetail: { 
    fontSize: 13, 
    fontWeight: '700', 
    color: theme.colors.text2, 
    fontVariant: ['tabular-nums'], 
  },

  joinButton: { 
    backgroundColor: theme.colors.primary, 
    paddingVertical: 10, 
    paddingHorizontal: 20, 
    borderRadius: 20, 
    shadowColor: theme.colors.primary, 
    shadowOffset: { width: 0, height: 3 }, 
    shadowOpacity: 0.2, 
    shadowRadius: 5, 
    elevation: 2, 
  },

  joinButtonText: { 
    fontSize: 14, 
    fontWeight: 'bold', 
    color: '#fff' 
  },
  
  modalOverlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0, 0, 0, 0.4)', 
    justifyContent: 'flex-end', 
  },

  modalContent: { 
    height: '90%', 
    backgroundColor: '#F7F9F5', 
    borderTopLeftRadius: 35, 
    borderTopRightRadius: 35, 
    paddingHorizontal: 30, 
    paddingTop: 25, 
  },

  modalHandle: { 
    width: 50, 
    height: 5, 
    backgroundColor: theme.colors.background, 
    borderRadius: 5, 
    alignSelf: 'center', 
    marginBottom: 20, 
  },
  
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },

  modalTitle: { 
    fontSize: 26, 
    fontWeight: '800', 
    color: theme.colors.text1, 
  },

  closeIconBtn: {
    padding: 8,
    backgroundColor: '#E5EDDF',
    borderRadius: 20,
  },

  scrollContainerWrapper: {
    flex: 1,
  },

  modalSubtitle: { 
    fontSize: 14, 
    color: theme.colors.text2, 
    lineHeight: 20, 
    marginBottom: 30, 
    textAlign: 'center'
  },
  
  inputLabel: { 
    fontSize: 16, 
    fontWeight: '700', 
    color: theme.colors.primary, 
    marginBottom: 12, 
  },

  helperText: { 
    fontSize: 13, 
    color: theme.colors.text2, 
    marginBottom: 15, 
    marginTop: -8, 
  },

  modalInput: { 
    backgroundColor: '#FFFFFF', 
    borderRadius: 20, 
    paddingHorizontal: 20, 
    paddingVertical: 18, 
    fontSize: 16, 
    color: theme.colors.text1, 
    marginBottom: 20, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.05, 
    shadowRadius: 5, 
    elevation: 2, 
  },

  customSubjectInput: { 
    backgroundColor: '#FFFFFF', 
    borderRadius: 20, 
    paddingHorizontal: 20, 
    paddingVertical: 16, 
    fontSize: 15, 
    color: theme.colors.text1, 
    marginBottom: 30, 
    marginTop: -25, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.05, 
    shadowRadius: 5, 
    elevation: 2 
  },
  
  modeSelectionContainer: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    marginBottom: 30 
  },
  modeOption: { 
    flex: 1, 
    backgroundColor: '#FFF', 
    padding: 15, 
    borderRadius: 20, 
    borderWidth: 2, 
    borderColor: '#F3F4F6', 
    alignItems: 'center', 
    marginHorizontal: 5 
  },
  modeOptionActive: { 
    borderColor: theme.colors.primary, 
    backgroundColor: '#F8FAFC' 
  },
  modeOptionTitle: { 
    fontSize: 15, 
    fontWeight: '800', 
    color: theme.colors.text1, 
    marginTop: 8, 
    marginBottom: 4 
  },
  modeOptionDesc: { 
    fontSize: 11, 
    color: theme.colors.text2, 
    textAlign: 'center' 
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
    elevation: 2 
  },

  stepper: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#E5EDDF', 
    borderRadius: 20, 
    padding: 5 
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
    elevation: 1 
  },

  stepText: { 
    fontSize: 16, 
    fontWeight: '800', 
    color: theme.colors.text1, 
    width: 55, 
    textAlign: 'center' 
  },

  circleOptionsContainer: { 
    flexDirection: 'row', 
    marginBottom: 30, 
  },
  circleButton: { 
    width: 46, 
    height: 46, 
    borderRadius: 23, 
    backgroundColor: '#E5EDDF', 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginRight: 12, 
  },
  circleButtonText: { 
    fontSize: 16, 
    fontWeight: 'bold', 
    color: theme.colors.text1, 
  },
  pillContainer: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    marginBottom: 40, 
  },
  pillButton: { 
    backgroundColor: '#E5EDDF', 
    paddingVertical: 12, 
    paddingHorizontal: 20, 
    borderRadius: 25, 
    marginRight: 10, 
    marginBottom: 10, 
  },
  pillText: { 
    fontSize: 15, 
    fontWeight: '700', 
    color: theme.colors.text1, 
  },

  addPillButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 25,
    marginRight: 10,
    marginBottom: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    borderStyle: 'dashed', 
    backgroundColor: '#F9FAFB'
  },
  
  modalActions: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    marginTop: 10, 
  },
  cancelButton: { 
    flex: 1, 
    paddingVertical: 16, 
    borderRadius: 25, 
    alignItems: 'center', 
    backgroundColor: '#E5E7EB', 
    marginRight: 10 
  },
  cancelButtonText: { 
    fontSize: 16, 
    fontWeight: 'bold', 
    color: theme.colors.text2 
  },
  confirmButton: { 
    flex: 1, 
    paddingVertical: 16, 
    borderRadius: 25, 
    alignItems: 'center', 
    backgroundColor: theme.colors.primary, 
    marginLeft: 10 
  },
  confirmButtonText: { 
    fontSize: 16, 
    fontWeight: 'bold', 
    color: '#FFF' 
  },

  modalOverlayJoin: { 
    flex: 1, 
    backgroundColor: 'rgba(0, 0, 0, 0.4)', 
    justifyContent: 'center', 
    paddingHorizontal: 20 
  },
  modalContentJoin: { 
    backgroundColor: '#F7F9F5', 
    borderRadius: 35, 
    paddingHorizontal: 30, 
    paddingTop: 30, 
    paddingBottom: 30 
  }
});