import { StyleSheet, Text, View, TouchableOpacity, FlatList, Modal, TextInput, Pressable, KeyboardAvoidingView, Platform, ScrollView } from 'react-native'
import React, { useState, useMemo } from 'react'
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context'
import SegmentedControl from '../components/SegmentedControl'
import FriendScreen from './FriendScreen'
import { Feather } from '@expo/vector-icons'; 

import { useTheme } from '../utils/ThemeProvider';
import { Theme } from '../utils/Themes'; 

export default function RoomScreen() {
    const navigation = useNavigation<any>();
    const { theme } = useTheme();
    const styles = useMemo(() => createStyles(theme), [theme]);

    const [index, setIndex] = useState(0)

    const [isModalVisible, setModalVisible] = useState(false);
    const [newRoomName, setNewRoomName] = useState(''); 
    const [maxMembers, setMaxMembers] = useState(4); 
    const [selectedSubjects, setSelectedSubjects] = useState<string[]>(['Math']); 
    
    const [roomMode, setRoomMode] = useState<'Shared' | 'Independent'>('Shared'); 

    const subjects = ['Math', 'English', 'Science', 'History', 'Design', 'Coding'];
    const memberOptions = [2, 4, 6, 8, 10]; 

    const subjectIcons: Record<string, string> = {
      'Math': '📐', 'English': '📚', 'Science': '🔬', 
      'History': '🏺', 'Design': '🎨', 'Coding': '💻'
    };

    const toggleSubject = (subject: string) => {
      setSelectedSubjects([subject]);
    };

    const [rooms, setRooms] = useState([
      { id: '1', name: 'Lavender Room', members: 4, max: 10, icon: '🌸', subject: 'English', mode: 'Shared' },
      { id: '2', name: 'Late Night Cafe', members: 12, max: 20, icon: '☕️', subject: 'Design', mode: 'Independent' },
      { id: '3', name: 'Math Geniuses', members: 2, max: 4, icon: '📐', subject: 'Math', mode: 'Shared' },
    ]);

    const handleCreateRoom = () => {
      if (newRoomName.trim() === '') {
        alert("Please enter a room name!"); 
        return;
      }

      const selectedSubject = selectedSubjects[0] || 'Study';
      
      const newRoom = {
        id: Date.now().toString(),
        name: newRoomName,
        members: 1, 
        max: maxMembers,
        icon: subjectIcons[selectedSubject] || '💡',
        subject: selectedSubject,
        mode: roomMode
      };

      setRooms([newRoom, ...rooms]);

      setModalVisible(false);
      setNewRoomName('');
      setMaxMembers(4);
      setRoomMode('Shared');
    };

    const handleJoinRoom = (item: any) => {
      const targetScreen = item.mode === 'Shared' ? 'RoomForStudyTogether' : 'RoomForIndependentStudy';
      navigation.navigate(targetScreen, {
        roomId: item.id,
        roomName: item.name,
        subject: item.subject,
        icon: item.icon
      });
    };

    const renderRoomCard = ({ item }: any) => (
      <TouchableOpacity 
        style={styles.roomCard} 
        activeOpacity={0.8}
        onPress={() => handleJoinRoom(item)}
      >
        <View style={styles.roomIconBg}>
          <Text style={styles.roomIcon}>{item.icon}</Text>
        </View>
        
        <View style={styles.roomInfo}>
          <Text style={styles.roomName}>{item.name}</Text>
          <View style={styles.roomMeta}>
            <View style={styles.miniPill}>
              <Text style={styles.miniPillText}>{item.subject}</Text>
            </View>

            <View style={[styles.modePill, item.mode === 'Independent' && styles.modePillIndependent]}>
               <Feather 
                  name={item.mode === 'Shared' ? 'users' : 'headphones'} 
                  size={10} 
                  color={item.mode === 'Shared' ? theme.colors.primary : '#F59E0B'} 
                  style={{marginRight: 4}} 
               />
               <Text style={[styles.modePillText, item.mode === 'Independent' && {color: '#F59E0B'}]}>
                  {item.mode}
               </Text>
            </View>

            <Text style={styles.roomMembers}>👤 {item.members}/{item.max}</Text>
          </View>
        </View>

        <TouchableOpacity 
          style={styles.joinButton}
          onPress={() => handleJoinRoom(item)}
        >
          <Text style={styles.joinButtonText}>Join</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );

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
        />

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
                <Text style={styles.modalTitle}>Create room</Text>
                <Text style={styles.modalSubtitle}>
                  Set up your room details and invite friends to study together in one place before saving.
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
                <Text style={styles.helperText}>Choose the subject you want to focus on.</Text>
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
                </View>

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
            </Pressable>
          </Pressable>
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
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#FFFFFF', 
    padding: 18, 
    borderRadius: 24, 
    marginBottom: 16, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.05, 
    shadowRadius: 8, 
    elevation: 3, 
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
  roomInfo: { 
    flex: 1, 
    justifyContent: 'center' 
  },
  roomName: { 
    fontSize: 18, 
    fontWeight: '800', 
    color: theme.colors.text1, 
    marginBottom: 6 
  },
  roomMeta: { 
    flexDirection: 'row', 
    alignContent: 'center', 
    alignItems: 'center' 
  },
  roomMembers: { 
    fontSize: 14, 
    color: theme.colors.text2, 
    fontWeight: '700' 
  },
  
  miniPill: { 
    backgroundColor: theme.colors.card, 
    paddingVertical: 4, 
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
    paddingVertical: 4, 
    paddingHorizontal: 8, 
    borderRadius: 12, 
    marginRight: 8 
  },
  modePillIndependent: { 
    backgroundColor: '#FEF3C7' 
  }, 
  modePillText: { 
    fontSize: 10, 
    fontWeight: '700', 
    color: theme.colors.primary 
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