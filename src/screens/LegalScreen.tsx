import { useMemo} from 'react';
import { useTheme } from '../utils/ThemeContext';
import { Theme } from '../utils/Themes'
import { ScrollView, Text, StyleSheet, View } from 'react-native';

export default function LegalScreen() {
    const { theme } = useTheme()
    const styles = useMemo(() => createStyles(theme), [theme])

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Privacy Policy</Text>
      <Text style={styles.date}>Effective: April 2026</Text>
      
      <Text style={styles.sectionTitle}>1. Data Collection</Text>
      <Text style={styles.body}>
        We collect your email and study session data via Firebase to sync your progress. 
        Your settings (vibration, notifications) are stored locally and in the cloud.
      </Text>

      <Text style={styles.sectionTitle}>2. GDPR Compliance</Text>
      <Text style={styles.body}>
        This is a university project. You have the right to access your data via the Statistics 
        screen and the right to be forgotten by deleting your account.
      </Text>
      
      <View style={{ height: 50 }} /> 
    </ScrollView>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: theme.colors.background },
  title: { fontSize: 24, fontWeight: 'bold', color: theme.colors.text1, marginBottom: 5 },
  date: { fontSize: 14, color: '#888', marginBottom: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: theme.colors.text1, marginTop: 15, marginBottom: 5 },
  body: { fontSize: 15, color: '#333', lineHeight: 22 },
});