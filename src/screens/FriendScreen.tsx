import { StyleSheet, Text, TouchableOpacity, View, FlatList } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context';
import React, {useMemo} from 'react'
import { useTheme } from '../utils/ThemeProvider';
import { Theme } from '../utils/Themes'; 
import { Feather } from '@expo/vector-icons';

export default function FriendScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const Friends = [
    {id: '1', name: 'Jason', avatar: '', status: 'Studying Math', isOnline: true, streak: 12},
    {id: '2', name: 'Christopher', avatar: '', status: 'Studying Math', isOnline: true, streak: 90},
  ]

  const renderFriend = ({item} : any) => (
    <TouchableOpacity style={styles.friendCard} activeOpacity={0.7}>
      <View style = {styles.avatarContainer}>
        <View style = {styles.avatarBg}>
          <Text>{item.avatar}</Text>
        </View>
        {item.isOnline && <View style = {styles.onlineDot}/>}
      </View>

      <View style = {styles.infoContainer}>
        <Text style={styles.friendName}>{item.name}</Text>
        <Text style={[
          styles.friendStatus, 
          { color: item.isOnline ? theme.colors.primary : theme.colors.text2 }
        ]}>{item.status}</Text>
      </View>

      <View>
        <Text>🔥{item.streak}</Text>
      </View>
    </TouchableOpacity>
  )

return (
    <SafeAreaView style={styles.container}>
      
      <View style={styles.header}>
        <Text style={styles.title}>Friends</Text>
        <TouchableOpacity style={styles.addButton}>
          <Feather name="user-plus" size={24} color={theme.colors.text1} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={Friends}
        keyExtractor={item => item.id}
        renderItem={renderFriend}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      />

    </SafeAreaView>
  )
}

const createStyles = (theme: Theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 30,
    marginBottom: 30,
  },

  title: {
    fontSize: 32,
    fontWeight: '800',
    color: theme.colors.text1,
    letterSpacing: 0.5,
  },

  addButton: {
    padding: 10,
    backgroundColor: theme.colors.card,
    borderRadius: 20,
  },

  listContent: {
    paddingHorizontal: 25,
    paddingBottom: 40,
  },
  
  friendCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 25,
    marginBottom: 10,
  },
  
  avatarContainer: {
    position: 'relative',
    marginRight: 15,
  },

  avatarBg: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 26,
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
    borderColor: theme.colors.card, 
  },

  infoContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  friendName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text1,
    marginBottom: 4,
  },
  friendStatus: {
    fontSize: 14,
    fontWeight: '600',
  },

  streakContainer: {
    backgroundColor: theme.colors.background,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 15,
  },
  streakText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: theme.colors.text1,
  }
});