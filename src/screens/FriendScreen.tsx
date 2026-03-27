import { StyleSheet, Text, TouchableOpacity, View, FlatList } from 'react-native'
import React, { useMemo } from 'react'
import { useTheme } from '../utils/ThemeProvider';
import { Theme } from '../utils/Themes'; 
import { Feather } from '@expo/vector-icons';

export default function FriendScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const Friends = [
    { id: '1', name: 'Jason', avatar: '🦊', status: 'Studying Math', isOnline: true, streak: 12 },
    { id: '2', name: 'Christopher', avatar: '🐱', status: 'Resting', isOnline: false, streak: 90 },
    { id: '3', name: 'Emma', avatar: '🐰', status: 'In a Pomodoro', isOnline: true, streak: 5 },
  ]

  const renderFriend = ({ item }: any) => (
    <TouchableOpacity style={styles.friendCard} activeOpacity={0.8}>
      
      <View style={styles.avatarContainer}>
        <View style={styles.avatarBg}>
          <Text style={styles.avatarText}>{item.avatar}</Text>
        </View>
        {item.isOnline && <View style={styles.onlineDot} />}
      </View>

      <View style={styles.infoContainer}>
        <Text style={styles.friendName}>{item.name}</Text>
        <Text style={[
          styles.friendStatus, 
          { color: item.isOnline ? theme.colors.primary : theme.colors.text2 }
        ]}>{item.status}</Text>
      </View>

      <View style={styles.streakContainer}>
        <Text style={styles.streakText}>🔥 {item.streak}</Text>
      </View>
      
    </TouchableOpacity>
  )

  return (
    <View style={styles.container}>
      
      <View style={styles.header}>
        <Text style={styles.title}>My Friends</Text>
        <TouchableOpacity style={styles.addButton}>
          <Feather name="user-plus" size={20} color="#FFF" />
          <Text style={styles.addButtonText}>Add</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={Friends}
        keyExtractor={item => item.id}
        renderItem={renderFriend}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      />

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
  }
});