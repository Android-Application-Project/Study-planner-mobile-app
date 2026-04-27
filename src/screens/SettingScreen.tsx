// import { StyleSheet, Text, View } from 'react-native'
// import React from 'react'

// export default function SettingScreen() {
//   return (
//     <View>
//       <Text>SettingScreen</Text>
//     </View>
//   )
// }

// const styles = StyleSheet.create({})

import React, { useState } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  Switch, 
  Platform 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useTheme } from 'src/utils/ThemeContext'; // Reusing your existing theme context

export default function SettingsScreen() {
  const { theme } = useTheme();
  
  // States for your existing features
  const [isVibrationEnabled, setIsVibrationEnabled] = useState(true);
  const [isNotificationsEnabled, setIsNotificationsEnabled] = useState(true);
  const [isLibraryAccessEnabled, setIsLibraryAccessEnabled] = useState(false);
  
  // States for new potential settings
  const [autoStartBreaks, setAutoStartBreaks] = useState(false);

  const SettingRow = ({ icon, label, value, onValueChange, type = 'switch', description }) => (
    <View style={[styles.rowContainer, { borderBottomColor: theme.dark ? '#333' : '#F0F0F0' }]}>
      <View style={styles.rowLeft}>
        <View style={[styles.iconBg, { backgroundColor: theme.colors.primary + '20' }]}>
          {icon}
        </View>
        <View style={styles.textContainer}>
          <Text style={[styles.label, { color: theme.colors.text1 }]}>{label}</Text>
          {description && <Text style={styles.description}>{description}</Text>}
        </View>
      </View>
      {type === 'switch' ? (
        <Switch 
          value={value} 
          onValueChange={onValueChange} 
          trackColor={{ false: '#767577', true: theme.colors.primary }}
          thumbColor={Platform.OS === 'ios' ? '#FFFFFF' : value ? '#f4f3f4' : '#f4f3f4'}
        />
      ) : (
        <Feather name="chevron-right" size={20} color="#CCC" />
      )}
    </View>
  );

  const SectionHeader = ({ title }) => (
    <Text style={[styles.sectionHeader, { color: theme.colors.primary }]}>{title.toUpperCase()}</Text>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: theme.colors.text1 }]}>Settings</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        <SectionHeader title="Feedback & Alerts" />
        <SettingRow 
          icon={<MaterialCommunityIcons name="vibrate" size={22} color={theme.colors.primary} />}
          label="Vibration Feedback"
          description="Vibrate when timer finishes"
          value={isVibrationEnabled}
          onValueChange={setIsVibrationEnabled}
        />
        <SettingRow 
          icon={<Ionicons name="notifications-outline" size={22} color={theme.colors.primary} />}
          label="Push Notifications"
          description="Reminders to stay focused"
          value={isNotificationsEnabled}
          onValueChange={setIsNotificationsEnabled}
        />

        <SectionHeader title="Privacy & Permissions" />
        <SettingRow 
          icon={<Feather name="folder" size={22} color={theme.colors.primary} />}
          label="Library Access"
          description="Allow app to access media"
          value={isLibraryAccessEnabled}
          onValueChange={setIsLibraryAccessEnabled}
        />

        <SectionHeader title="Timer Logic" />
        <SettingRow 
          icon={<Feather name="play-circle" size={22} color={theme.colors.primary} />}
          label="Auto-start Breaks"
          value={autoStartBreaks}
          onValueChange={setAutoStartBreaks}
        />
        
        <SectionHeader title="Support" />
        <TouchableOpacity>
          <SettingRow 
            icon={<Feather name="help-circle" size={22} color={theme.colors.primary} />}
            label="Help Center"
            type="chevron"
          />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.logoutBtn}>
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>

        <Text style={styles.versionText}>Focus App v1.0.4</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 25,
    marginBottom: 10,
    letterSpacing: 1,
  },
  rowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
    borderBottomWidth: 1,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconBg: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  textContainer: {
    flex: 1,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
  },
  description: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  logoutBtn: {
    marginTop: 40,
    padding: 15,
    borderRadius: 12,
    backgroundColor: '#FF3B3015',
    alignItems: 'center',
  },
  logoutText: {
    color: '#FF3B30',
    fontWeight: 'bold',
    fontSize: 16,
  },
  versionText: {
    textAlign: 'center',
    color: '#AAA',
    fontSize: 12,
    marginTop: 20,
  }
});