import { StyleSheet, Text, View, TouchableOpacity } from 'react-native'
import React, { useState, useMemo } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native';
import Entypo from '@expo/vector-icons/Entypo';
import DropDownPicker from 'react-native-dropdown-picker';
import { useTheme } from '../utils/ThemeProvider';
import { Theme } from '../utils/Themes'; 

export default function HomeScreen() {
  const navigation = useNavigation<any>()
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState('English');
  
  const [items, setItems] = useState([
    { label: 'English', value: 'English' },
    { label: 'Finnish', value: 'Finnish' },
    { label: 'German', value: 'German' },
    { label: 'Project', value: 'Project' },
  ]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.header, { zIndex: 1000 }]}>
        <View style={styles.coinBadge}>
          <Text style={styles.coinText}>🔥 30</Text>
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

        <TouchableOpacity 
          style={styles.iconButton} 
          onPress={() => navigation.navigate('CalendarScreen')}>
          <Entypo name="calendar" size={26} color={theme.colors.text1} />
        </TouchableOpacity>
      </View>
      
      <View style={styles.titleContainer}>
          <Text style={styles.title}>Let's feed Alex!</Text>
      </View>

      <View style={styles.timerContainer}>
        <View style={styles.timerCircle}>
          <Text style={styles.animalImage}>🐱</Text>
        </View>
        <View style={styles.progressDot}></View>
      </View>

      <Text style={styles.timeText}>20:00</Text>

      <TouchableOpacity style={styles.feedButton} activeOpacity={0.8}>
        <Text style={styles.feedButtonText}>Feed</Text>
      </TouchableOpacity>
      
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
    marginBottom: 40,
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
    elevation: 5 
  },

  dropdownText: { 
    fontSize: 16, 
    fontWeight: 'bold', 
    color: theme.colors.text1, 
    textAlign: 'center' 
  },

  titleContainer: {
    alignItems: 'center',
    marginBottom: 100,
  },

  title: { 
    fontSize: 30, 
    fontWeight: '800', 
    color: theme.colors.text1, 
    letterSpacing: 1.5, 
    fontFamily: 'serif',
  },

  timerContainer: { 
    position: 'relative', 
    alignItems: 'center', 
    justifyContent: 'center', 
    marginBottom: 100,
  },

  timerCircle: {
    width: 280, 
    height: 280, 
    borderRadius: 140, 
    borderWidth: 2, 
    borderColor: theme.colors.text2,
    justifyContent: 'center', 
    alignItems: 'center',
  },

  progressDot: {
    position: 'absolute', 
    top: -8,
    width: 16, 
    height: 16, 
    borderRadius: 8,
    backgroundColor: theme.colors.primary, 
  },

  animalImage: { 
    fontSize: 120,
  },

  timeText: { 
    fontSize: 40,
    fontWeight: '800', 
    color: theme.colors.text1, 
    marginBottom: 20,
  },
  
  feedButton: {
    backgroundColor: theme.colors.primary, 
    width: 150,
    paddingVertical: 16, 
    borderRadius: 30,
    alignItems: 'center',
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.15, 
    shadowRadius: 4, 
    elevation: 3,
  },

  feedButtonText: { 
    fontSize: 15, 
    color: '#FFF', 
    fontWeight: '700',
    letterSpacing: 3,
  },
});