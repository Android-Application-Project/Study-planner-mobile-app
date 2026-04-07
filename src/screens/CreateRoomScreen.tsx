import React, { useEffect, useMemo, useState } from 'react'
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore'
import { useTheme } from '../utils/ThemeProvider'
import { Theme } from '../utils/Themes'
import { auth, db } from '../../firebaseConfig'
import { cancelScheduleNotificationsAsync } from '../utils/Notifications'

const withOpacity = (hex: string, opacity: number) => {
  const normalized = hex.replace('#', '')
  const safeHex =
    normalized.length === 3
      ? normalized
          .split('')
          .map((value) => value + value)
          .join('')
      : normalized

  const red = parseInt(safeHex.slice(0, 2), 16)
  const green = parseInt(safeHex.slice(2, 4), 16)
  const blue = parseInt(safeHex.slice(4, 6), 16)

  return `rgba(${red}, ${green}, ${blue}, ${opacity})`
}

type SubjectSchedule = {
  id: string
  subjectName: string
  deadline: string
  pomodoroMinutes: number
  difficulty: number
  importance: number
  readiness: number
  sessions: Array<{ id?: string; notificationId?: string | null }>
}

const formatDate = (date: Date) => {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

const isExpired = (deadline: string) => deadline < formatDate(new Date())

export default function CreateRoomScreen() {
  const { theme } = useTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const [subjects, setSubjects] = useState<SubjectSchedule[]>([])

  useEffect(() => {
    const user = auth.currentUser
    if (!user) return

    const userRef = doc(db, 'users', user.uid)
    const unsubscribe = onSnapshot(userRef, async (snapshot) => {
      if (!snapshot.exists()) {
        setSubjects([])
        return
      }

      const data = snapshot.data()
      const rawSchedules = (
        Array.isArray(data.smartSchedules)
          ? data.smartSchedules
          : data.smartScheduleDraft
            ? [data.smartScheduleDraft]
            : []
      ) as SubjectSchedule[]

      const activeSchedules = rawSchedules.filter((item) => !isExpired(item.deadline))
      setSubjects(activeSchedules.sort((first, second) => first.deadline.localeCompare(second.deadline)))

      if (activeSchedules.length !== rawSchedules.length) {
        await setDoc(
          userRef,
          {
            smartSchedules: activeSchedules,
            smartScheduleUpdatedAt: serverTimestamp(),
          },
          { merge: true },
        )
      }
    })

    return () => unsubscribe()
  }, [])

  const handleDeleteSubject = async (subjectId: string) => {
    const user = auth.currentUser
    if (!user) return

    const deletedSubject = subjects.find((item) => item.id === subjectId)
    const nextSubjects = subjects.filter((item) => item.id !== subjectId)

    try {
      await cancelScheduleNotificationsAsync(deletedSubject)
      await setDoc(
        doc(db, 'users', user.uid),
        {
          smartSchedules: nextSubjects,
          smartScheduleUpdatedAt: serverTimestamp(),
        },
        { merge: true },
      )
    } catch (error) {
      console.error('Error deleting subject:', error)
      Alert.alert('Delete failed', 'The subject could not be removed right now.')
    }
  }

  const confirmDelete = (subject: SubjectSchedule) => {
    Alert.alert(
      'Delete subject',
      `Remove ${subject.subjectName} and all of its scheduled sessions?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => handleDeleteSubject(subject.id) },
      ],
    )
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.heroCard}>
        <Text style={styles.heroEyebrow}>My Subjects</Text>
        <Text style={styles.heroTitle}>Manage the subjects already in your schedule</Text>
        <Text style={styles.heroDescription}>
          Subjects past their deadline are removed automatically. You can also delete any
          subject manually, and its calendar sessions disappear with it.
        </Text>
      </View>

      {subjects.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No active subjects</Text>
          <Text style={styles.emptyText}>
            Generate a schedule first. When subjects expire after their deadline, they are
            cleaned up automatically here.
          </Text>
        </View>
      ) : (
        subjects.map((subject) => (
          <View key={subject.id} style={styles.subjectCard}>
            <View style={styles.subjectHeader}>
              <View style={styles.subjectBadge}>
                <Text style={styles.subjectBadgeText}>{subject.subjectName.slice(0, 2).toUpperCase()}</Text>
              </View>

              <View style={styles.subjectInfo}>
                <Text style={styles.subjectTitle}>{subject.subjectName}</Text>
                <Text style={styles.subjectMeta}>
                  Deadline: {subject.deadline} • {subject.sessions.length} session(s)
                </Text>
              </View>
            </View>

            <View style={styles.metricsRow}>
              <View style={styles.metricBox}>
                <Text style={styles.metricValue}>{subject.pomodoroMinutes}m</Text>
                <Text style={styles.metricLabel}>Pomodoro</Text>
              </View>
              <View style={styles.metricBox}>
                <Text style={styles.metricValue}>{subject.difficulty}/5</Text>
                <Text style={styles.metricLabel}>Difficulty</Text>
              </View>
              <View style={styles.metricBox}>
                <Text style={styles.metricValue}>{subject.importance}/5</Text>
                <Text style={styles.metricLabel}>Importance</Text>
              </View>
              <View style={styles.metricBox}>
                <Text style={styles.metricValue}>{subject.readiness}/5</Text>
                <Text style={styles.metricLabel}>Readiness</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.deleteButton} onPress={() => confirmDelete(subject)}>
              <Text style={styles.deleteButtonText}>Delete Subject</Text>
            </TouchableOpacity>
          </View>
        ))
      )}
    </ScrollView>
  )
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    content: {
      paddingHorizontal: 18,
      paddingBottom: 32,
      gap: 16,
    },
    heroCard: {
      marginTop: 10,
      backgroundColor: theme.colors.text2,
      borderRadius: 28,
      padding: 22,
    },
    heroEyebrow: {
      color: '#F4FFF7',
      fontSize: 12,
      fontWeight: '800',
      letterSpacing: 1.1,
      textTransform: 'uppercase',
      marginBottom: 10,
    },
    heroTitle: {
      color: '#FFFFFF',
      fontSize: 24,
      fontWeight: '800',
      marginBottom: 10,
    },
    heroDescription: {
      color: '#ECF7EE',
      fontSize: 14,
      lineHeight: 21,
    },
    emptyCard: {
      backgroundColor: withOpacity(theme.colors.card, theme.dark ? 0.3 : 0.22),
      borderRadius: 24,
      padding: 22,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: withOpacity(theme.colors.text2, theme.dark ? 0.35 : 0.12),
    },
    emptyTitle: {
      color: theme.colors.text1,
      fontSize: 20,
      fontWeight: '800',
      marginBottom: 8,
    },
    emptyText: {
      color: theme.colors.text2,
      textAlign: 'center',
      lineHeight: 21,
    },
    subjectCard: {
      backgroundColor: withOpacity(theme.colors.card, theme.dark ? 0.3 : 0.22),
      borderRadius: 24,
      padding: 18,
      borderWidth: 1,
      borderColor: withOpacity(theme.colors.text2, theme.dark ? 0.35 : 0.12),
      shadowColor: theme.colors.secondary1,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: theme.dark ? 0.18 : 0.08,
      shadowRadius: 10,
      elevation: 3,
    },
    subjectHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
    },
    subjectBadge: {
      width: 54,
      height: 54,
      borderRadius: 18,
      backgroundColor: theme.colors.card,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 14,
    },
    subjectBadgeText: {
      color: theme.colors.text1,
      fontSize: 16,
      fontWeight: '800',
    },
    subjectInfo: {
      flex: 1,
    },
    subjectTitle: {
      color: theme.colors.text1,
      fontSize: 18,
      fontWeight: '800',
      marginBottom: 4,
    },
    subjectMeta: {
      color: theme.colors.text2,
      fontWeight: '600',
      lineHeight: 20,
    },
    metricsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      marginBottom: 16,
    },
    metricBox: {
      minWidth: '47%',
      flex: 1,
      backgroundColor: withOpacity(theme.colors.background, theme.dark ? 0.28 : 0.92),
      borderRadius: 18,
      padding: 14,
    },
    metricValue: {
      color: theme.colors.text1,
      fontWeight: '800',
      fontSize: 16,
      marginBottom: 4,
    },
    metricLabel: {
      color: theme.colors.text2,
      fontWeight: '600',
      fontSize: 13,
    },
    deleteButton: {
      backgroundColor: withOpacity(theme.colors.notification, theme.dark ? 0.28 : 0.14),
      borderRadius: 18,
      paddingVertical: 14,
      alignItems: 'center',
    },
    deleteButtonText: {
      color: theme.colors.notification,
      fontWeight: '800',
      fontSize: 15,
    },
  })
