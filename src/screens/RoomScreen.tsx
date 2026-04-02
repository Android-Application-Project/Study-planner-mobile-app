import { StyleSheet, Text, View, TouchableOpacity, FlatList, Modal, TextInput, Pressable, KeyboardAvoidingView, Platform, ScrollView } from 'react-native'
import React, { useState, useMemo, useEffect } from 'react'
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context'
import SegmentedControl from '../components/SegmentedControl'
import FriendScreen from './FriendScreen'
import { Feather, Ionicons } from '@expo/vector-icons'; 

import { useTheme } from '../utils/ThemeProvider';
import { Theme } from '../utils/Themes';

import { collection, addDoc, onSnapshot, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebaseConfig';

export default function RoomScreen() {
    const navigation = useNavigation<any>();
    const { theme } = useTheme();
    const styles = useMemo(() => createStyles(theme), [theme]);

    const [index, setIndex] = useState(0)

    const [isModalVisible, setModalVisible] = useState(false);
    const [newRoomName, setNewRoomName] = useState(''); 
    const [maxMembers, setMaxMembers] = useState(4); 

    const [selectedSubjects, setSelectedSubjects] = useState<string[]>(['Math']); 
    const [customSubject, setCustomSubject] = useState('');

    const [showCustomInput, setShowCustomInput] = useState(false)
    
    const [roomMode, setRoomMode] = useState<'Shared' | 'Independent'>('Shared'); 

    const [focusTime, setFocusTime] = useState(25);
    const [breakTime, setBreakTime] = useState(5);

    const subjects = ['Math', 'English', 'Science', 'History', 'Design', 'Coding'];
    const memberOptions = [2, 4, 6, 8, 10]; 

    const subjectIcons: Record<string, string> = {
      'Math': '📐', 'English': '📚', 'Science': '🔬', 
      'History': '🏺', 'Design': '🎨', 'Coding': '💻'
    };
    const [rooms, setRooms] = useState<any[]>([]);

    useEffect(() => {
        if (!db) return;

        const roomsRef = collection(db, 'rooms');
        const q = query(roomsRef, orderBy('createdAt', 'desc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedRooms = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setRooms(fetchedRooms);
        });

        return () => unsubscribe();
    }, []);

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

    const adjustSetting = (type: 'focus' | 'break', amount: number) => {
        if (type === 'focus') setFocusTime(prev => Math.max(5, prev + amount));
        if (type === 'break') setBreakTime(prev => Math.max(1, prev + amount));
    };

    // 🔥 4. 將新建的房間上傳到 Firebase
    const handleCreateRoom = async () => {
      if (newRoomName.trim() === '') {
        alert("Please enter a room name!"); 
        return;
      }

      const finalSubject = customSubject.trim() !== '' ? customSubject.trim() : (selectedSubjects[0] || 'Study');
      
      try {
        const roomsRef = collection(db, 'rooms');

        await addDoc(roomsRef, {
          name: newRoomName,
          members: 1, 
          max: maxMembers,
          icon: subjectIcons[finalSubject] || '💡',
          subject: finalSubject,
          mode: roomMode,
          focusTime: roomMode === 'Shared' ? focusTime : null, 
          breakTime: roomMode === 'Shared' ? breakTime : null,
          createdAt: serverTimestamp() 
        });

        setModalVisible(false);
        setNewRoomName('');
        setMaxMembers(4);
        setRoomMode('Shared');
        setFocusTime(25); 
        setBreakTime(5);  
        setCustomSubject('');
        setShowCustomInput(false);

      } catch (error) {
        console.error("Error creating room: ", error);
        alert("創建房間失敗，請檢查網路連線。");
      }
    };

    const handleJoinRoom = (item: any) => {
      const targetScreen = item.mode === 'Shared' ? 'RoomForStudyTogether' : 'RoomForIndependentStudy';
      navigation.navigate(targetScreen, {
        roomId: item.id,
        roomName: item.name,
        subject: item.subject,
        icon: item.icon,
        focusTime: item.focusTime,
        breakTime: item.breakTime
      });
    };

    const renderRoomCard = ({ item }: any) => {
        return (
          <View style={styles.roomCard}>
            <View style={styles.cardContentSection}>
              <View style={styles.roomIconBg}>
                <Text style={styles.roomIcon}>{item.icon}</Text>
              </View>
              
              <View style={styles.roomInfoColumn}>
                <Text style={styles.roomName}>{item.name}</Text>
                <View style={styles.roomMetaRow}>
                  <View style={styles.miniPill}>
                    <Text style={styles.miniPillText}>{item.subject}</Text>
                  </View>
                  
                  <View style={[styles.modePill, item.mode === 'Independent' && styles.modePillIndependent]}>
                     <Feather 
                        name={item.mode === 'Shared' ? 'users' : 'headphones'} 
                        size={12} 
                        color={item.mode === 'Shared' ? theme.colors.primary : '#F59E0B'} 
                        style={{marginRight: 4}} 
                     />
                     <Text style={[styles.modePillText, item.mode === 'Independent' && {color: '#F59E0B'}]}>
                        {item.mode} Timer
                     </Text>
                  </View>
                </View>
              </View>
            </View>

            <View style={styles.cardActionSection}>
              <Text style={styles.cardActionDetail}>
                  👤 {item.members}/{item.max} Joined • Starts soon
              </Text>

              <TouchableOpacity 
                style={styles.joinButton}
                activeOpacity={0.8}
                onPress={() => handleJoinRoom(item)}
              >
                <Text style={styles.joinButtonText}>Join</Text>
              </TouchableOpacity>
            </View>
          </View> 
        );
    };

    let studyTogetherContent = (
      <View style={styles.contentArea}>
        
        <View style={styles.subHeader}>
          <Text style={styles.sectionTitle}>Available Rooms</Text>
          <TouchableOpacity style={styles.createButton} onPress={() => setModalVisible(true)}>
            <Feather name="plus" size={20} color="#FFF" />
            <Text style={styles.createButtonText}>Create</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={rooms}
          keyExtractor={item => item.id}
          renderItem={renderRoomCard}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', marginTop: 50 }}>
              <Text style={{ color: theme.colors.text2, fontSize: 16 }}>No rooms available yet.</Text>
              <Text style={{ color: theme.colors.text2, fontSize: 14, marginTop: 5 }}>Be the first to create one!</Text>
            </View>
          }
        />

        <Modal animationType="slide" transparent={true} visible={isModalVisible} onRequestClose={() => setModalVisible(false)}>
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
            style={{ flex: 1 }}
          >
            <Pressable style={styles.modalOverlay} onPress={() => setModalVisible(false)}>
              <View style={styles.modalContent}>
                <View style={styles.modalHandle} />
                
                <ScrollView 
                  showsVerticalScrollIndicator={false} 
                  contentContainerStyle={{ paddingBottom: 40 }}
                  keyboardShouldPersistTaps="handled" 
                >
                  <Text style={styles.modalTitle}>Create room</Text>
                  <Text style={styles.modalSubtitle}>
                    Set up your room details and invite friends.
                  </Text>

                  <Text style={styles.inputLabel}>Room name</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="e.g. Late Night Study"
                    placeholderTextColor={theme.colors.text2}
                    value={newRoomName}
                    onChangeText={setNewRoomName}
                  />

                  <Text style={styles.inputLabel}>Study Mode</Text>
                  <Text style={styles.helperText}>How do you want to study?</Text>
                  <View style={styles.modeSelectionContainer}>
                     <TouchableOpacity 
                        style={[styles.modeOption, roomMode === 'Shared' && styles.modeOptionActive]}
                        onPress={() => setRoomMode('Shared')}
                     >
                        <Feather name="users" size={24} color={roomMode === 'Shared' ? theme.colors.primary : theme.colors.text2} />
                        <Text style={[styles.modeOptionTitle, roomMode === 'Shared' && {color: theme.colors.primary}]}>Shared</Text>
                        <Text style={styles.modeOptionDesc}>Same timer for everyone</Text>
                     </TouchableOpacity>

                     <TouchableOpacity 
                        style={[styles.modeOption, roomMode === 'Independent' && styles.modeOptionActive]}
                        onPress={() => setRoomMode('Independent')}
                     >
                        <Feather name="headphones" size={24} color={roomMode === 'Independent' ? theme.colors.primary : theme.colors.text2} />
                        <Text style={[styles.modeOptionTitle, roomMode === 'Independent' && {color: theme.colors.primary}]}>Independent</Text>
                        <Text style={styles.modeOptionDesc}>Set your own timer</Text>
                     </TouchableOpacity>
                  </View>

                  {roomMode === 'Shared' && (
                    <>
                      <View style={styles.settingRow}>
                        <View>
                            <Text style={styles.inputLabel}>Focus Duration</Text>
                            <Text style={styles.helperText}>Set room focus time</Text>
                        </View>
                        <View style={styles.stepper}>
                            <TouchableOpacity style={styles.stepButton} onPress={() => adjustSetting('focus', -5)}>
                                <Feather name="minus" size={20} color={theme.colors.text1} />
                            </TouchableOpacity>
                            <Text style={styles.stepText}>{focusTime} m</Text>
                            <TouchableOpacity style={styles.stepButton} onPress={() => adjustSetting('focus', 5)}>
                                <Feather name="plus" size={20} color={theme.colors.text1} />
                            </TouchableOpacity>
                        </View>
                      </View>

                      <View style={styles.settingRow}>
                        <View>
                            <Text style={styles.inputLabel}>Break Duration</Text>
                            <Text style={styles.helperText}>Set room break time</Text>
                        </View>
                        <View style={styles.stepper}>
                            <TouchableOpacity style={styles.stepButton} onPress={() => adjustSetting('break', -1)}>
                                <Feather name="minus" size={20} color={theme.colors.text1} />
                            </TouchableOpacity>
                            <Text style={styles.stepText}>{breakTime} m</Text>
                            <TouchableOpacity style={styles.stepButton} onPress={() => adjustSetting('break', 1)}>
                                <Feather name="plus" size={20} color={theme.colors.text1} />
                            </TouchableOpacity>
                        </View>
                      </View>
                    </>
                  )}

                  <Text style={styles.inputLabel}>Max members per room</Text>
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

                  <Text style={styles.inputLabel}>Subject tags</Text>
                  <Text style={styles.helperText}>Choose the subject.</Text>
                  <View style={styles.pillContainer}>
                    {subjects.map((sub) => {
                      const isSelected = selectedSubjects.includes(sub);
                      return (
                        <TouchableOpacity 
                          key={sub}
                          style={[styles.pillButton, isSelected && { backgroundColor: theme.colors.primary } ]}
                          onPress={() => toggleSubject(sub)}
                        >
                          <Text style={[styles.pillText, isSelected && { color: '#FFF' }]}>{sub}</Text>
                        </TouchableOpacity>
                      );
                    })}

                    {!showCustomInput && (
                      <TouchableOpacity 
                        style = {styles.addPillButton}
                        onPress={() => {
                          setShowCustomInput(true);
                          setSelectedSubjects([]);
                        }}
                      >
                        <Feather name = 'plus' size = {18} color = {theme.colors.text2} />
                      </TouchableOpacity>
                    )}
                  </View>

                  {showCustomInput && (
                    <TextInput
                      style = { styles.customSubjectInput}
                      placeholder='Type the subject... (e.g. React)'
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
            </Pressable>
          </KeyboardAvoidingView>
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
    paddingHorizontal: 30, 
    marginBottom: 20, 
    marginTop: 10 
  },

  sectionTitle: { 
    fontSize: 20, 
    fontWeight: 'bold', 
    color: theme.colors.text1 
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

  roomName: { 
    fontSize: 20,
    fontWeight: '800', 
    color: theme.colors.text1, 
    marginBottom: 6 
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
    height: '85%', 
    backgroundColor: '#F7F9F5', 
    borderTopLeftRadius: 35, 
    borderTopRightRadius: 35, 
    paddingHorizontal: 30, 
    paddingTop: 15, 
  },

  modalHandle: { 
    width: 50, 
    height: 5, 
    backgroundColor: theme.colors.background, 
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
    marginBottom: 30, 
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
  }
});