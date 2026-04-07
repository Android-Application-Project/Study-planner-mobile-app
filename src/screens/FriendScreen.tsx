import { StyleSheet, Text, TouchableOpacity, View, FlatList, Alert, Modal, TextInput, KeyboardAvoidingView, Platform, Pressable, Image } from 'react-native'
import React, { useMemo, useState, useEffect } from 'react'
import { useTheme } from '../utils/ThemeProvider';
import { Theme } from '../utils/Themes'; 
import { Feather, Ionicons, MaterialIcons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';

import { doc, onSnapshot, collection, query, where, documentId, updateDoc, arrayUnion, getDoc, arrayRemove } from 'firebase/firestore';
import { db, auth } from '../../firebaseConfig';

export default function FriendScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const currentUserId = auth.currentUser?.uid;
  const [friends, setFriends] = useState<any[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([])
  const [isAddModalVisible, setAddModalVisible] = useState(false);
  const [isRequestModalVisible, setRequestModalVisible] = useState(false);
  const [friendIdInput, setFriendIdInput] = useState('');

  useEffect(() => {
    if(!db || !currentUserId) return;
    let unsubscribeFriends: any = null;
    let unsubscribePending: any = null;

    const myRef = doc(db, 'users', currentUserId);
    const unsubscribeMe = onSnapshot(myRef, (docSnap) => {
      if (docSnap.exists()){
        const myData = docSnap.data();
        const myFriendIds = myData.friendIds || [];
        const myPendingIds = myData.pendingRequests || []; 

        if (myFriendIds.length === 0){
          setFriends([]);
          if(unsubscribeFriends) unsubscribeFriends();
        } else {
          const friendsQuery = query(collection(db, 'users'), where(documentId(), 'in', myFriendIds));
          if (unsubscribeFriends) unsubscribeFriends();
          unsubscribeFriends = onSnapshot(friendsQuery, (friendsSnap) => {
            setFriends(friendsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
          });
        }

        if (myPendingIds.length === 0){
          setPendingRequests([]);
          if(unsubscribePending) unsubscribePending();
        } else {
          const pendingQuery = query(collection(db, 'users'), where(documentId(), 'in', myPendingIds));
          if (unsubscribePending) unsubscribePending();
          unsubscribePending = onSnapshot(pendingQuery, (pendingSnap) => {
            setPendingRequests(pendingSnap.docs.map(d => ({ id: d.id, ...d.data() })));
          });
        }
      }
    });

    return() => {
      unsubscribeMe();
      if (unsubscribeFriends) unsubscribeFriends();
      if (unsubscribePending) unsubscribePending();
    };
  }, [currentUserId]);

  const handleDeleteFriend = (friendId: string, friendName: string) => {
    Alert.alert(
      'Delete friends',
      `Are you sure you wanna delete ${friendName} ?`,
      [
        {text: 'cancel', style: 'cancel'},
        {
          text: 'yes, I am sure',
          style: 'destructive',
          onPress: async() => {
            try {
              const myRef = doc(db, 'users', currentUserId as string);
              await updateDoc(myRef, {
                friendIds: arrayRemove(friendId)
              });
            }catch (error) {
              Alert.alert("error", "delete failed, please try again later");
            }   
          }
        }
      ]
    )
  }

  const handleAddFriendSubmit = async () => {
      const targetId = friendIdInput.trim();
      if (!targetId) return;
      if (targetId === currentUserId) { Alert.alert("Oops!", "You can't add yourself!"); return; }

      try {
        const friendRef = doc(db, 'users', targetId);
        const friendSnap = await getDoc(friendRef);

        if (!friendSnap.exists()) {
          Alert.alert("Not Found", "We couldn't find a user with this ID.");
          return;
        }

        const friendData = friendSnap.data();
        if (friendData.friendIds?.includes(currentUserId)) {
          Alert.alert("Notice", "You are already friends!"); return;
        }

        if (friendData.pendingRequests?.includes(currentUserId)) {
          Alert.alert("Notice", "Request already sent! Please wait."); 
          return;
        }

        await updateDoc(friendRef, {
          pendingRequests: arrayUnion(currentUserId)
        });

        Alert.alert("Request Sent! ✉️", "Wait for them to accept your request.");
        setAddModalVisible(false); 
        setFriendIdInput('');
      } catch (error) { Alert.alert("Error", "Failed to send request."); }
    };

    const handleAcceptRequest = async (requesterId: string) => {
      try {
        const myRef = doc(db, 'users', currentUserId as string);
        const requesterRef = doc(db, 'users', requesterId);

        await updateDoc(myRef, {
          pendingRequests: arrayRemove(requesterId),
          friendIds: arrayUnion(requesterId)
        });
        await updateDoc(requesterRef, {
          friendIds: arrayUnion(currentUserId)
        });
      } catch (error) { Alert.alert("Error", "Failed to accept."); }
    };

    const handleDeclineRequest = async (requesterId: string) => {
      try {
        const myRef = doc(db, 'users', currentUserId as string);
        await updateDoc(myRef, { pendingRequests: arrayRemove(requesterId) });
      } catch (error) { Alert.alert("Error", "Failed to decline."); }
    };

    const renderFriend = ({ item }: any) => (
      <View style={styles.friendCard}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatarBg}>
            {item.avatar && item.avatar.startsWith('http') ? (
              <Image source={{ uri: item.avatar }} style={{ width: 56, height: 56, borderRadius: 28 }} />
            ) : (
              <Text style={styles.avatarText}>{item.avatar || '👤'}</Text>
            )}
          </View>
          {item.isOnline && <View style={styles.onlineDot} />}
        </View>
        <View style={styles.infoContainer}>
          <Text style={styles.friendName}>{item.name || 'Unknown User'}</Text>
          <Text style={[styles.friendStatus, { color: item.isOnline ? theme.colors.primary : theme.colors.text2 }]}>{item.status || 'Chilling'}</Text>
        </View>
        <View style={styles.streakContainer}><Text style={styles.streakText}>🔥 {item.streak || 0}</Text></View>
        <TouchableOpacity style={styles.deleteButton} onPress={() => handleDeleteFriend(item.id, item.name)}>
            <Ionicons name="trash-outline" size={20} color={theme.colors.notification} />
        </TouchableOpacity>
      </View>
    );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Friends</Text>
          
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity style={styles.notificationIcon} onPress={() => setRequestModalVisible(true)}>
            <MaterialIcons name="notifications-none" size={28} color={theme.colors.text1} />
            {pendingRequests.length > 0 && (
              <View style={styles.redDot}>
                <Text style={styles.redDotText}>{pendingRequests.length}</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.addButton} onPress={() => setAddModalVisible(true)}>
            <Feather name="user-plus" size={20} color="#FFF" />
            <Text style={styles.addButtonText}>Add</Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={friends}
        keyExtractor={item => item.id}
        renderItem={renderFriend}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', marginTop: 50 }}>
            <Text style={{ color: theme.colors.text2, fontSize: 16 }}>You haven't added any friends yet.</Text>
          </View>
        }
      />

      <Modal animationType="slide" transparent={true} visible={isRequestModalVisible} onRequestClose={() => setRequestModalVisible(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setRequestModalVisible(false)}>
          <Pressable style={[styles.modalCenterContent, { maxHeight: '60%' }]} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>Friend Requests</Text>
            {pendingRequests.length === 0 ? (
              <Text style={{ textAlign: 'center', color: theme.colors.text2, marginVertical: 20 }}>No pending requests.</Text>
            ) : (
              <FlatList
                data={pendingRequests}
                keyExtractor={item => item.id}
                renderItem={({ item }) => (
                  <View style={styles.requestCard}>
                    {item.avatar && item.avatar.startsWith('http') ? (
                      <Image source={{ uri: item.avatar }} style={{ width: 44, height: 44, borderRadius: 22, marginRight: 10 }} />
                    ):(
                      <Text style={{ fontSize: 24, marginRight: 10 }}>{item.avatar || '👤'}</Text>
                    )
                  }
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontWeight: 'bold', fontSize: 16 }}>{item.name || 'Unknown User'}</Text>
                      <Text style={{ color: theme.colors.text2, fontSize: 12 }}>wants to be your friend!</Text>
                    </View>
                    <TouchableOpacity style={styles.actionBtn} onPress={() => handleDeclineRequest(item.id)}>
                      <Feather name="x" size={24} color={theme.colors.notification} />
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.actionBtn, { marginLeft: 10 }]} onPress={() => handleAcceptRequest(item.id)}>
                      <Feather name="check" size={24} color={theme.colors.primary} />
                    </TouchableOpacity>
                  </View>
                )}
              />
            )}
            <TouchableOpacity style={styles.cancelButton} onPress={() => setRequestModalVisible(false)}>
              <Text style={styles.cancelButtonText}>Close</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal animationType="fade" transparent={true} visible={isAddModalVisible} onRequestClose={() => setAddModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <Pressable style={styles.modalOverlay} onPress={() => setAddModalVisible(false)}>
            <Pressable style={styles.modalCenterContent} onPress={(e) => e.stopPropagation()}>
              <Text style={styles.modalTitle}>Add a Friend</Text>
              <TextInput style={styles.modalInput} placeholder="Paste Friend ID here..." value={friendIdInput} onChangeText={setFriendIdInput} autoCapitalize="none" />
              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.cancelButton} onPress={() => setAddModalVisible(false)}><Text style={styles.cancelButtonText}>Cancel</Text></TouchableOpacity>
                <TouchableOpacity style={styles.confirmButton} onPress={handleAddFriendSubmit}><Text style={styles.confirmButtonText}>Send Request</Text></TouchableOpacity>
              </View>
              <TouchableOpacity style={{ marginTop: 20, alignItems: 'center' }} onPress={async () => {
                if (currentUserId) { await Clipboard.setStringAsync(currentUserId); Alert.alert("Copied!", "ID copied to clipboard."); }
                }}>
                <Text style={styles.myIdHint}>Your ID: <Text style={{ color: theme.colors.primary, fontWeight: 'bold' }}>{currentUserId}</Text></Text>
                <Text style={{ fontSize: 10, color: '#999', marginTop: 4 }}>(Tap to copy)</Text>
              </TouchableOpacity>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  )
  }

const createStyles = (theme: Theme) => StyleSheet.create({
  container: {
    flex: 1,
  },
  
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 30,
    marginBottom: 20,
    marginTop: 10,
  },

  title: {
    fontSize: 22, 
    fontWeight: '800',
    color: theme.colors.text1,
  },

  notificationIcon: {
    marginRight: 15, 
    position: 'relative' 
  },
  redDot: { 
    position: 'absolute', 
    top: -5, 
    right: -5, 
    backgroundColor: '#EF4444', 
    width: 18, 
    height: 18, 
    borderRadius: 9, 
    justifyContent: 'center', 
    alignItems: 'center', 
    borderWidth: 1.5, 
    borderColor: '#FFF' 
  },
  redDotText: { 
    color: '#FFF', 
    fontSize: 10, 
    fontWeight: 'bold' 
  },

  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
  },
  addButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
    marginLeft: 5,
    fontSize: 14,
  },

  listContent: {
    paddingHorizontal: 25,
    paddingBottom: 40,
  },
  
  friendCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 18,
    borderRadius: 24,
    marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 3,
  },
  
  avatarContainer: {
    position: 'relative',
    marginRight: 15,
  },

  avatarBg: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#E5EDDF', 
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 28,
  },
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#4CAF50',
    borderWidth: 2,
    borderColor: '#FFFFFF', 
  },

  infoContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  friendName: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.text1,
    marginBottom: 4,
  },
  friendStatus: {
    fontSize: 13,
    fontWeight: '700',
  },

  streakContainer: {
    backgroundColor: '#E5EDDF', 
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 15,
  },
  streakText: {
    fontSize: 13,
    fontWeight: '800',
    color: theme.colors.primary,
  },

  deleteButton: { 
    padding: 8 
  },

  modalOverlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0, 0, 0, 0.4)', 
    justifyContent: 'center', 
    paddingHorizontal: 20
  },
  modalCenterContent: { 
    backgroundColor: '#F7F9F5', 
    borderRadius: 30, 
    padding: 25, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 10 }, 
    shadowOpacity: 0.1, 
    shadowRadius: 20, 
    elevation: 10
  },
  modalTitle: { 
    fontSize: 22, 
    fontWeight: '800', 
    color: theme.colors.text1, 
    marginBottom: 8, 
    textAlign: 'center' 
  },
  modalSubtitle: { 
    fontSize: 14, 
    color: theme.colors.text2, 
    textAlign: 'center', 
    marginBottom: 25 
  },
  modalInput: { 
    backgroundColor: '#FFFFFF', 
    borderRadius: 15, 
    paddingHorizontal: 20, 
    paddingVertical: 15, 
    fontSize: 16, 
    color: theme.colors.text1, 
    marginBottom: 25, 
    borderWidth: 1, 
    borderColor: '#E5E7EB'
  },
  modalActions: { 
    flexDirection: 'row', 
    justifyContent: 'space-between' 
  },
  cancelButton: { 
    flex: 1, 
    paddingVertical: 15, 
    borderRadius: 20, 
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
    paddingVertical: 15, 
    borderRadius: 20, 
    alignItems: 'center', 
    backgroundColor: theme.colors.primary, 
    marginLeft: 10 
  },
  confirmButtonText: { 
    fontSize: 16, 
    fontWeight: 'bold', 
    color: '#FFF' 
  },
  myIdHint: { 
    textAlign: 'center', 
    fontSize: 11, 
    color: theme.colors.text2, 
    marginTop: 20 
  },

  requestCard: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#FFF', 
    padding: 15, 
    borderRadius: 15, 
    marginBottom: 10, 
    borderWidth: 1, 
    borderColor: '#E5E7EB' 
  },
  actionBtn: { 
    padding: 10, 
    backgroundColor: '#F3F4F6', 
    borderRadius: 12 
  }
});