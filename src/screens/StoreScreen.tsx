import { StyleSheet, Text, View, TouchableOpacity, FlatList, Dimensions } from 'react-native'
import React, { useMemo, useState } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTheme } from '../utils/ThemeProvider';
import { Theme } from '../utils/Themes'; 

const screenWidth = Dimensions.get('window').width;
const cardWidth = (screenWidth - 60 - 15) / 2;

export default function StoreScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [activeTab, setActiveTab] = useState<'themes' | 'animals'>('themes');
  const [coins, setCoins] = useState(300);

  const mockThemes = [
    { id: 't1', name: 'Default', price: 0, color: '#84A98C', status: 'equipped' },
    { id: 't2', name: 'Ocean Blue', price: 150, color: '#64B5F6', status: 'owned' },
    { id: 't3', name: 'Royal Purple', price: 200, color: '#BA68C8', status: 'buyable' },
    { id: 't4', name: 'Dark Mode', price: 300, color: '#2F3E46', status: 'buyable' },
  ];

  const mockAnimals = [
    { id: 'a1', name: 'Alex', icon: '🐱', price: 0, status: 'equipped' },
    { id: 'a2', name: 'Rex', icon: '🦊', price: 300, status: 'buyable' },
    { id: 'a3', name: 'Peppa', icon: '🐷', price: 400, status: 'buyable' },
    { id: 'a4', name: 'Kermit', icon: '🐸', price: 250, status: 'buyable' },
  ];

  const renderActionButton = (status: string, price: number) => {
    if (status === 'equipped') {
      return (
        <View style={[styles.actionButton, styles.buttonEquipped]}>
          <Text style={[styles.actionButtonText, { color: theme.colors.text1 }]}>Equipped</Text>
        </View>
      );
    } else if (status === 'owned') {
      return (
        <View style={[styles.actionButton, styles.buttonOwned]}>
          <Text style={[styles.actionButtonText, { color: theme.colors.text1 }]}>Use</Text>
        </View>
      );
    } else {
      return (
        <View style={[styles.actionButton, styles.buttonBuy]}>
          <Text style={styles.actionButtonText}>🐟 {price}</Text>
        </View>
      );
    }
  };

  const renderItem = ({ item }: any) => {
    const isTheme = activeTab === 'themes';
    
    return (
      <TouchableOpacity style={styles.cardContainer} activeOpacity={0.9}>
        {isTheme ? (
          <View style={[styles.previewArea, { backgroundColor: item.color }]} />
        ) : (
          <View style={[styles.previewArea, styles.animalPreviewBg]}>
            <Text style={styles.animalIcon}>{item.icon}</Text>
          </View>
        )}
        <View style={styles.cardInfo}>
          <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
          {renderActionButton(item.status, item.price)}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Store</Text>
        <View style={styles.coinBadge}>
          <Text style={styles.coinText}>🐟 {coins}</Text>
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
        data={(activeTab === 'themes' ? mockThemes : mockAnimals) as any[]}
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
    backgroundColor: theme.colors.primary,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFF',
  }
});