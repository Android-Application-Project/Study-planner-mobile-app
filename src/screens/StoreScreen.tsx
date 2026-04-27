import { StyleSheet, Text, View, TouchableOpacity, FlatList, Dimensions, Alert, Image } from 'react-native'
import React, { useMemo, useState, useEffect } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import { doc, updateDoc, onSnapshot, arrayUnion } from 'firebase/firestore'
import { db, auth } from '../../firebaseConfig'
import { useTheme } from '../utils/ThemeContext'
import { Theme, themes } from '../utils/Themes'
import Currency, { formatCurrency } from 'src/components/Currency'

interface StoreItem {
  id: string;
  name: string;
  price: number;
  color?: string; 
}

const themeStoreItem : StoreItem[] = Object.entries(themes).map(([key, value]) => ({
  id: key,
  name: value.name,
  price: value.price,
  color: value.colors.primary
}))

const animals: StoreItem[] = [
  { id: 'elephant', name: 'Elephant', price: 0 },
  { id: 'crocodile', name: 'Crocodile', price: 300 },
  { id: 'shark', name: 'Shark', price: 500 },
];

const ANIMAL_IMAGES = {
  elephant: require('../assets/Animal/AdultElephant.png'),
  crocodile: require('../assets/Animal/AdultCrocodile.png'),
  shark: require('../assets/Animal/AdultShark.png'),
};

const THEME_IMAGES = {
  default: require('../assets/Theme/green.png'),
  beige: require('../assets/Theme/beige.png'),
  blue: require('../assets/Theme/blue.png'),
  purple: require('../assets/Theme/purple.png')
};

const screenWidth = Dimensions.get('window').width;
const cardWidth = (screenWidth - 60 - 15) / 2;

export default function StoreScreen() {
  const { theme, setTheme, themeName } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const USER_ID = auth.currentUser?.uid;

  const [activeTab, setActiveTab] = useState<'themes' | 'animals'>('themes');
  const [coins, setCoins] = useState(0);
  const [unlockedPets, setUnlockedPets] = useState<string[]>(['elephant']);
  const [currentPetId, setCurrentPetId] = useState('elephant');
  const [unlockedThemes, setUnlockedThemes] = useState<string[]>(['default']);

  const displayData: StoreItem[] = activeTab === 'themes' ? themeStoreItem : animals;

  useEffect(() => {
    if (!USER_ID) return;
    const unsub = onSnapshot(doc(db, 'users', USER_ID), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setCoins(data.coins || 0);
        setUnlockedPets(data.unlockedPets || ['elephant']);
        setCurrentPetId(data.selectedPetId || 'elephant');
        setUnlockedThemes(data.unlockedThemes || ['default']);
      }
    });
    return () => unsub();
  }, [USER_ID]);

  if (!USER_ID) return null;

  const handleAction = async (item: StoreItem) => {
    const isAnimal = activeTab === 'animals';
    const isOwned = isAnimal ? unlockedPets.includes(item.id) : unlockedThemes.includes(item.id);

    if (isOwned) {
      if (!USER_ID) return;
      const userRef = doc(db, 'users', USER_ID);
      if (isAnimal) {
        await updateDoc(userRef, { selectedPetId: item.id });
      } else {
        setTheme(item.id as any);
        await updateDoc(userRef, { currentThemeId: item.id });
      }
    } else {
      if (coins < item.price) {
        Alert.alert("Error", "Not enough coins!");
        return;
      }

      Alert.alert("Confirm Purchase", `Buy ${item.name} for ${formatCurrency(item.price)} coins?`, [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Buy", 
          onPress: async () => {
            if (!USER_ID) return;
            const userRef = doc(db, 'users', USER_ID);
            const updateField = isAnimal ? { unlockedPets: arrayUnion(item.id) } : { unlockedThemes: arrayUnion(item.id) };
            await updateDoc(userRef, {
              coins: coins - item.price,
              ...updateField
            });
          }
        }
      ]);
    }
  };

  const renderActionButton = (item: StoreItem) => {
    const isAnimal = activeTab === 'animals';
    const isOwned = isAnimal ? unlockedPets.includes(item.id) : unlockedThemes.includes(item.id);
    const isEquipped = isAnimal ? currentPetId === item.id : themeName === item.id;

    if (isEquipped) {
      return (
        <View style={[styles.actionButton, styles.buttonEquipped]}>
          <Text style={[styles.actionButtonText, { color: theme.colors.primary }]}>Equipped</Text>
        </View>
      );
    }

    return (
      <TouchableOpacity 
        style={[styles.actionButton, isOwned ? styles.buttonOwned : styles.buttonBuy]} 
        onPress={() => handleAction(item)}
      >
        <Text style={[styles.actionButtonText, isOwned && { color: theme.colors.text1 }]}>
          {isOwned ? "Use" : <Currency amount={item.price}/>}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderItem = ({ item }: { item: StoreItem }) => {
    const isTheme = activeTab === 'themes';
    
    return (
      <View style={styles.cardContainer}>
        {isTheme ? (
          <View style={styles.previewArea}>
              <Image
                source={THEME_IMAGES[item.id as keyof typeof THEME_IMAGES]}
                style={{ width: '100%', height: '100%' }}
                resizeMode="cover"
              />
            </View>        
        ) : (
          <View style={[styles.previewArea, styles.animalPreviewBg]}>
            <Image 
              source={ANIMAL_IMAGES[item.id as keyof typeof ANIMAL_IMAGES]} 
              style={{ width: 80, height: 80 }} 
              resizeMode="contain" 
            />
          </View>
        )}
        <View style={styles.cardInfo}>
          <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
          {renderActionButton(item)}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Store</Text>
        <View style={styles.coinBadge}>
          <Currency amount={coins}/>
        </View>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tabButton, activeTab === 'themes' && styles.activeTab]}
          onPress={() => setActiveTab('themes')}
        >
          <Text style={[styles.tabText, activeTab === 'themes' && styles.activeTabText]}>Themes</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.tabButton, activeTab === 'animals' && styles.activeTab]}
          onPress={() => setActiveTab('animals')}
        >
          <Text style={[styles.tabText, activeTab === 'animals' && styles.activeTabText]}>Animals</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        key={activeTab} 
        data={displayData}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        numColumns={2}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        columnWrapperStyle={styles.columnWrapper}
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
    marginTop: 10,
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.colors.text1,
  },
  coinBadge: {
    backgroundColor: theme.colors.card,
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
  },
  coinText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text1,
  },
  
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 30,
    marginBottom: 20,
  },
  tabButton: {
    marginRight: 15,
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
    backgroundColor: 'transparent',
  },
  activeTab: {
    backgroundColor: theme.colors.primary,
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text2,
  },
  activeTabText: {
    color: '#FFF',
  },

  listContent: {
    paddingHorizontal: 30,
    paddingBottom: 40,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  

  cardContainer: {
    backgroundColor: theme.colors.card, 
    width: cardWidth,
    borderRadius: 20,
    overflow: 'hidden', 
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  previewArea: {
    height: 120,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  animalPreviewBg: {
    backgroundColor: 'rgba(255,255,255,0.4)', 
  },
  animalIcon: {
    fontSize: 65,
  },
  cardInfo: {
    padding: 12,
    alignItems: 'center',
  },
  itemName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text1,
    marginBottom: 10,
  },
  
  actionButton: {
    width: '100%',
    paddingVertical: 8,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonEquipped: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: theme.colors.primary,
  },
  buttonOwned: {
    backgroundColor: theme.colors.background,
  },
  buttonBuy: {
    backgroundColor: theme.colors.background,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFF',
  }
});