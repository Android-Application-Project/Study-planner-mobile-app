import { useMemo, useState } from 'react'
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import DateTimePicker from '@react-native-community/datetimepicker'
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import SegmentedControl from '../components/SegmentedControl'
import CreateRoomScreen from './CreateRoomScreen'
import { useTheme } from '../utils/ThemeProvider'
import { Theme } from '../utils/Themes'
import { auth, db } from '../../firebaseConfig'
import { cancelScheduleNotificationsAsync, syncScheduleNotificationsAsync } from '../utils/Notifications'

type TimePreference = 'Morning' | 'Afternoon' | 'Evening'
type SessionDensity = 1 | 2 | 3
type Rating = 1 | 2 | 3 | 4 | 5

type DayOption = {
  label: string
  weekday: number
}

type ScheduleSession = {
  id: string
  date: string
  day: string
  title: string
  start: string
  end: string
  minutes: number
  focusType: string
  room: string
  icons: string
  completed?: boolean
  skipped?: boolean
  notificationId?: string | null
}

type SubjectSchedule = {
  id: string
  subjectName: string
  pomodoroMinutes: number
  deadline: string
  difficulty: Rating
  importance: Rating
  readiness: Rating
  sessionDensity: SessionDensity
  timePreference: TimePreference
  selectedDays: string[]
  sessions: ScheduleSession[]
  generatedOn: string
}

const DAY_OPTIONS: DayOption[] = [
  { label: 'Mon', weekday: 1 },
  { label: 'Tue', weekday: 2 },
  { label: 'Wed', weekday: 3 },
  { label: 'Thu', weekday: 4 },
  { label: 'Fri', weekday: 5 },
  { label: 'Sat', weekday: 6 },
  { label: 'Sun', weekday: 0 },
]

const RATING_OPTIONS: Rating[] = [1, 2, 3, 4, 5]
const TIME_OPTIONS: TimePreference[] = ['Morning', 'Afternoon', 'Evening']
const SESSION_DENSITY_OPTIONS: SessionDensity[] = [1, 2, 3]

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

const TIME_BASE_HOUR: Record<TimePreference, number> = {
  Morning: 8,
  Afternoon: 14,
  Evening: 19,
}

const formatHour = (hour: number, minute = 0) =>
  `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`

const formatDate = (date: Date) => {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

const formatDeadlineLabel = (date: Date) =>
  date.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate())

const addDays = (date: Date, amount: number) => {
  const nextDate = new Date(date)
  nextDate.setDate(nextDate.getDate() + amount)
  return nextDate
}

const addMinutesToTime = (time: string, minutesToAdd: number) => {
  const [hours, minutes] = time.split(':').map(Number)
  const totalMinutes = hours * 60 + minutes + minutesToAdd
  const endHour = Math.floor(totalMinutes / 60)
  const endMinute = totalMinutes % 60
  return formatHour(endHour, endMinute)
}

const parseDeadline = (value: string) => {
  const [year, month, day] = value.split('-').map(Number)
  if (!year || !month || !day) return null

  const parsed = new Date(year, month - 1, day)
  if (Number.isNaN(parsed.getTime())) return null

  return parsed
}

const getDatePool = (deadline: Date, selectedDays: string[]) => {
  const today = startOfDay(new Date())
  const lastDay = startOfDay(deadline)
  const allowedWeekdays = DAY_OPTIONS.filter((item) => selectedDays.includes(item.label)).map(
    (item) => item.weekday,
  )

  const result: Date[] = []
  for (let cursor = today; cursor <= lastDay; cursor = addDays(cursor, 1)) {
    if (allowedWeekdays.includes(cursor.getDay())) {
      result.push(new Date(cursor))
    }
  }

  return result
}

const getDeadlinePressureMultiplier = (daysLeft: number) => {
  if (daysLeft <= 3) return 1.45
  if (daysLeft <= 7) return 1.3
  if (daysLeft <= 14) return 1.18
  if (daysLeft <= 30) return 1.08
  return 1
}

const roundUpToFive = (value: number) => Math.ceil(value / 5) * 5

const getFocusType = (difficulty: Rating, readiness: Rating) => {
  if (difficulty >= 4 && readiness <= 2) return 'Deep problem-solving'
  if (difficulty >= 4) return 'High-focus revision'
  if (readiness <= 2) return 'Foundation rebuild'
  if (readiness >= 4) return 'Practice and recall'
  return 'Steady review'
}

const getScheduleIcon = (difficulty: Rating, importance: Rating) => {
  if (difficulty >= 4 && importance >= 4) return '!'
  if (difficulty >= 4) return '*'
  if (importance >= 4) return '+'
  return '-'
}

export default function CreateScheduleScreen() {
  const navigation = useNavigation<any>()
  const [index, setIndex] = useState(0)
  const { theme } = useTheme()
  const styles = useMemo(() => createStyles(theme), [theme])

  const todayString = useMemo(() => formatDate(new Date()), [])
  const minimumDeadlineDate = useMemo(() => startOfDay(addDays(new Date(), 1)), [])
  const suggestedDeadlineDate = useMemo(() => startOfDay(addDays(new Date(), 14)), [])
  const suggestedDeadline = useMemo(() => formatDate(suggestedDeadlineDate), [suggestedDeadlineDate])

  const [subjectName, setSubjectName] = useState('')
  const [pomodoroMinutes, setPomodoroMinutes] = useState('50')
  const [deadline, setDeadline] = useState(suggestedDeadline)
  const [deadlinePickerVisible, setDeadlinePickerVisible] = useState(false)
  const [difficulty, setDifficulty] = useState<Rating>(3)
  const [importance, setImportance] = useState<Rating>(3)
  const [readiness, setReadiness] = useState<Rating>(3)
  const [sessionDensity, setSessionDensity] = useState<SessionDensity>(2)
  const [timePreference, setTimePreference] = useState<TimePreference>('Evening')
  const [selectedDays, setSelectedDays] = useState<string[]>(['Mon', 'Wed', 'Fri'])

  const toggleDay = (day: string) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((item) => item !== day) : [...prev, day],
    )
  }

  const selectedDeadlineLabel = useMemo(() => {
    const parsed = parseDeadline(deadline)
    return parsed ? formatDeadlineLabel(parsed) : deadline
  }, [deadline])

  const saveScheduleToFirebase = async (payload: SubjectSchedule) => {
    const user = auth.currentUser
    if (!user) throw new Error('Login required')

    const userRef = doc(db, 'users', user.uid)
    const snapshot = await getDoc(userRef)
    const data = snapshot.data()
    const existingSchedules = (Array.isArray(data?.smartSchedules)
      ? data?.smartSchedules
      : []) as SubjectSchedule[]

    const filteredSchedules = existingSchedules.filter(
      (item) =>
        item.id !== payload.id &&
        item.subjectName.toLowerCase() !== payload.subjectName.toLowerCase(),
    )
    const replacedSchedule = existingSchedules.find(
      (item) =>
        item.id === payload.id ||
        item.subjectName.toLowerCase() === payload.subjectName.toLowerCase(),
    )

    await cancelScheduleNotificationsAsync(replacedSchedule)

    await setDoc(
      userRef,
      {
        smartSchedules: [...filteredSchedules, payload].sort((a, b) => a.deadline.localeCompare(b.deadline)),
        smartScheduleDraft: payload,
        smartScheduleUpdatedAt: serverTimestamp(),
      },
      { merge: true },
    )
  }

  const generateSchedule = async () => {
    const trimmedSubject = subjectName.trim()
    const sessionMinutesInput = Number(pomodoroMinutes)
    const parsedDeadline = parseDeadline(deadline)

    if (!trimmedSubject) {
      Alert.alert('Missing subject', 'Please enter the subject name first.')
      return
    }

    if (!Number.isFinite(sessionMinutesInput) || sessionMinutesInput < 20) {
      Alert.alert('Invalid pomodoro', 'Pomodoro session length should be at least 20 minutes.')
      return
    }

    if (!parsedDeadline || deadline.length !== 10) {
      Alert.alert('Invalid deadline', 'Please choose a valid future deadline.')
      return
    }

    const today = startOfDay(new Date())
    const lastDay = startOfDay(parsedDeadline)

    if (lastDay < today) {
      Alert.alert('Deadline passed', 'Please choose a deadline from tomorrow onward.')
      return
    }

    if (selectedDays.length === 0) {
      Alert.alert('Select study days', 'Choose at least one day to build the plan.')
      return
    }

    const datePool = getDatePool(parsedDeadline, selectedDays)
    if (datePool.length === 0) {
      Alert.alert('No matching dates', 'Your selected days do not appear before the deadline.')
      return
    }

    const daysLeft = Math.max(
      1,
      Math.ceil((lastDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) + 1,
    )
    const weeksLeft = Math.max(1, Math.ceil(daysLeft / 7))
    const urgencyMultiplier = getDeadlinePressureMultiplier(daysLeft)
    const sessionLength = roundUpToFive(Math.min(120, Math.max(20, sessionMinutesInput)))
    const recommendedSessionsPerWeek = Math.max(
      2,
      Math.round(
        (2.5 + difficulty * 0.7 + importance * 0.6 + (6 - readiness) * 0.8) *
          urgencyMultiplier,
      ),
    )
    const requiredSessions = Math.max(1, Math.ceil(recommendedSessionsPerWeek * weeksLeft))
    const maxSlots = datePool.length * sessionDensity
    const sessionCount = Math.min(requiredSessions, maxSlots)

    if (sessionCount === 0) {
      Alert.alert('Not enough room', 'Increase available days or session density.')
      return
    }

    const totalMinutesToAssign = sessionCount * sessionLength
    const baseMinutes = Math.max(35, roundUpToFive(Math.max(sessionLength, totalMinutesToAssign / sessionCount)))
    const focusType = getFocusType(difficulty, readiness)
    const room =
      daysLeft <= 7 ? 'Deadline sprint' : readiness <= 2 ? 'Catch-up lane' : 'Balanced progress'

    const usageByDate: Record<string, number> = {}
    const schedule: ScheduleSession[] = []
    const scheduleId = `${trimmedSubject.toLowerCase().replace(/\s+/g, '-')}-${todayString}`

    for (let indexValue = 0; indexValue < sessionCount; indexValue += 1) {
      const slotDate = datePool[indexValue % datePool.length]
      const dateKey = formatDate(slotDate)
      const slotIndex = usageByDate[dateKey] ?? 0
      usageByDate[dateKey] = slotIndex + 1

      const startHour = TIME_BASE_HOUR[timePreference] + slotIndex * 2
      const start = formatHour(startHour)
      const assignedMinutes = schedule.reduce((sum, item) => sum + item.minutes, 0)
      const remainingMinutes = totalMinutesToAssign - assignedMinutes
      const minutes =
        indexValue === sessionCount - 1
          ? Math.max(35, remainingMinutes)
          : Math.min(baseMinutes, Math.max(35, remainingMinutes - (sessionCount - indexValue - 1) * 35))

      schedule.push({
        id: `${scheduleId}-${dateKey}-${indexValue}`,
        date: dateKey,
        day: DAY_OPTIONS.find((item) => item.weekday === slotDate.getDay())?.label ?? 'Day',
        title: trimmedSubject,
        start,
        end: addMinutesToTime(start, minutes),
        minutes,
        focusType,
        room,
        icons: getScheduleIcon(difficulty, importance),
        completed: false,
        skipped: false,
      })
    }

    const payload: SubjectSchedule = {
      id: scheduleId,
      subjectName: trimmedSubject,
      pomodoroMinutes: sessionLength,
      deadline,
      difficulty,
      importance,
      readiness,
      sessionDensity,
      timePreference,
      selectedDays,
      sessions: schedule,
      generatedOn: todayString,
    }

    try {
      const scheduleWithNotifications = await syncScheduleNotificationsAsync(payload)
      await saveScheduleToFirebase(scheduleWithNotifications)
      Alert.alert('Schedule generated', 'The smart schedule was saved and synced to the calendar.', [
        { text: 'Open Calendar', onPress: () => navigation.navigate('CalendarScreen') },
        { text: 'Stay Here', style: 'cancel' },
      ])
    } catch (error) {
      console.error('Error generating smart schedule:', error)
      Alert.alert('Save failed', 'The schedule was generated but could not be saved.')
    }
  }

  const renderRatingSelector = (
    label: string,
    value: Rating,
    onChange: (nextValue: Rating) => void,
    helperText: string,
  ) => (
    <>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.helperText}>{helperText}</Text>
      <View style={styles.ratingRow}>
        {RATING_OPTIONS.map((option) => {
          const isSelected = value === option
          return (
            <TouchableOpacity
              key={`${label}-${option}`}
              style={[styles.ratingChip, isSelected && styles.ratingChipActive]}
              onPress={() => onChange(option)}
            >
              <Text style={[styles.ratingChipText, isSelected && styles.ratingChipTextActive]}>
                {option}
              </Text>
            </TouchableOpacity>
          )
        })}
      </View>
    </>
  )

  return (
    <SafeAreaView style={styles.container}>
      <SegmentedControl values={['Add Schedule', 'My Subjects']} selectedIndex={index} onChange={setIndex} />

      {index === 0 ? (
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.heroCard}>
            <Text style={styles.heroEyebrow}>Smart Schedule Builder</Text>
            <Text style={styles.heroTitle}>Create a detailed plan from real study context</Text>
            <Text style={styles.heroDescription}>
              This version uses difficulty, importance, readiness, deadline, preferred time,
              available days, and session density to build a schedule with actual calendar dates.
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Subject Inputs</Text>

            <Text style={styles.label}>Subject name</Text>
            <TextInput
              value={subjectName}
              onChangeText={setSubjectName}
              placeholder="Example: Database Systems"
              placeholderTextColor={theme.colors.text2}
              style={styles.input}
            />

            <Text style={styles.label}>Pomodoro session length</Text>
            <Text style={styles.helperText}>How long one focused study session should last, in minutes.</Text>
            <TextInput
              value={pomodoroMinutes}
              onChangeText={setPomodoroMinutes}
              placeholder="50"
              placeholderTextColor={theme.colors.text2}
              style={styles.input}
              keyboardType="numeric"
            />

            <Text style={styles.label}>Deadline</Text>
            <Text style={styles.helperText}>
              Pick a deadline by scrolling. The picker starts from tomorrow, so past dates and today cannot be selected. Today is {todayString}.
            </Text>
            <TouchableOpacity style={styles.deadlineButton} onPress={() => setDeadlinePickerVisible(true)}>
              <View>
                <Text style={styles.deadlineButtonLabel}>Selected deadline</Text>
                <Text style={styles.deadlineButtonValue}>{selectedDeadlineLabel}</Text>
              </View>
              <Text style={styles.deadlineButtonHint}>Change</Text>
            </TouchableOpacity>

            {renderRatingSelector('Difficulty (1-5)', difficulty, setDifficulty, '1 = very easy, 5 = very hard.')}
            {renderRatingSelector('Importance (1-5)', importance, setImportance, 'Use a higher score for finals, core subjects, or heavily weighted assessments.')}
            {renderRatingSelector('Current readiness (1-5)', readiness, setReadiness, '1 = not prepared yet, 5 = already comfortable with the subject.')}

            <Text style={styles.label}>Preferred study time</Text>
            <Text style={styles.helperText}>This decides the default start hour.</Text>
            <View style={styles.choiceRow}>
              {TIME_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[styles.choiceChip, timePreference === option && styles.choiceChipActive]}
                  onPress={() => setTimePreference(option)}
                >
                  <Text style={[styles.choiceChipText, timePreference === option && styles.choiceChipTextActive]}>
                    {option}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Session density</Text>
            <Text style={styles.helperText}>Max study blocks the app may place on the same day.</Text>
            <View style={styles.ratingRow}>
              {SESSION_DENSITY_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={`density-${option}`}
                  style={[styles.ratingChip, sessionDensity === option && styles.ratingChipActive]}
                  onPress={() => setSessionDensity(option)}
                >
                  <Text style={[styles.ratingChipText, sessionDensity === option && styles.ratingChipTextActive]}>
                    {option}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Available study days</Text>
            <Text style={styles.helperText}>Only these days will receive sessions before the deadline.</Text>
            <View style={styles.dayGrid}>
              {DAY_OPTIONS.map((day) => {
                const isSelected = selectedDays.includes(day.label)
                return (
                  <TouchableOpacity
                    key={day.label}
                    style={[styles.dayChip, isSelected && styles.dayChipActive]}
                    onPress={() => toggleDay(day.label)}
                  >
                    <Text style={[styles.dayChipText, isSelected && styles.dayChipTextActive]}>{day.label}</Text>
                  </TouchableOpacity>
                )
              })}
            </View>

            <TouchableOpacity style={styles.primaryButton} onPress={generateSchedule}>
              <Text style={styles.primaryButtonText}>Generate Schedule and Sync Calendar</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      ) : (
        <CreateRoomScreen />
      )}

      <Modal animationType="slide" transparent visible={deadlinePickerVisible} onRequestClose={() => setDeadlinePickerVisible(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setDeadlinePickerVisible(false)}>
          <Pressable style={styles.deadlineModalCard} onPress={(event) => event.stopPropagation()}>
            <View style={styles.modalHandle} />
            <Text style={styles.deadlineModalTitle}>Choose Deadline</Text>
            <Text style={styles.deadlineModalSubtitle}>Use the native iOS-style date picker. Only future dates are available.</Text>
            <View style={styles.deadlinePickerFrame}>
              <DateTimePicker
                value={parseDeadline(deadline) ?? suggestedDeadlineDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                minimumDate={minimumDeadlineDate}
                onChange={(_, selectedDate) => {
                  if (selectedDate) {
                    const normalizedDate = selectedDate < minimumDeadlineDate ? minimumDeadlineDate : selectedDate
                    setDeadline(formatDate(normalizedDate))
                  }
                }}
                style={styles.nativeDatePicker}
                textColor={theme.colors.text1}
                accentColor={theme.colors.primary}
              />
            </View>
            <TouchableOpacity style={styles.primaryButton} onPress={() => setDeadlinePickerVisible(false)}>
              <Text style={styles.primaryButtonText}>Use This Deadline</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  )
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: 18,
      paddingBottom: 32,
      gap: 16,
    },
    heroCard: {
      marginTop: 8,
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
    card: {
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
    sectionTitle: {
      color: theme.colors.text1,
      fontSize: 20,
      fontWeight: '800',
      marginBottom: 14,
    },
    label: {
      color: theme.colors.text1,
      fontSize: 14,
      fontWeight: '700',
      marginBottom: 8,
      marginTop: 10,
    },
    helperText: {
      color: theme.colors.text2,
      fontSize: 13,
      lineHeight: 19,
      marginBottom: 10,
    },
    input: {
      borderRadius: 16,
      backgroundColor: withOpacity(theme.colors.background, theme.dark ? 0.28 : 0.92),
      paddingHorizontal: 16,
      paddingVertical: 14,
      color: theme.colors.text1,
      borderWidth: 1,
      borderColor: withOpacity(theme.colors.text2, theme.dark ? 0.45 : 0.2),
    },
    deadlineButton: {
      borderRadius: 18,
      backgroundColor: withOpacity(theme.colors.background, theme.dark ? 0.28 : 0.92),
      borderWidth: 1,
      borderColor: withOpacity(theme.colors.text2, theme.dark ? 0.45 : 0.2),
      paddingHorizontal: 16,
      paddingVertical: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    deadlineButtonLabel: {
      color: theme.colors.primary,
      fontSize: 13,
      fontWeight: '700',
      marginBottom: 4,
      textTransform: 'uppercase',
      letterSpacing: 0.9,
    },
    deadlineButtonValue: {
      color: theme.colors.text1,
      fontSize: 17,
      fontWeight: '800',
    },
    deadlineButtonHint: {
      color: theme.colors.primary,
      fontWeight: '800',
      fontSize: 14,
    },
    ratingRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    ratingChip: {
      width: 48,
      height: 48,
      borderRadius: 16,
      backgroundColor: withOpacity(theme.colors.card, theme.dark ? 0.42 : 0.55),
      alignItems: 'center',
      justifyContent: 'center',
    },
    ratingChipActive: {
      backgroundColor: theme.colors.primary,
    },
    ratingChipText: {
      color: theme.colors.text1,
      fontWeight: '800',
      fontSize: 16,
    },
    ratingChipTextActive: {
      color: '#FFFFFF',
    },
    choiceRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    choiceChip: {
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 999,
      backgroundColor: withOpacity(theme.colors.card, theme.dark ? 0.42 : 0.55),
    },
    choiceChipActive: {
      backgroundColor: theme.colors.primary,
    },
    choiceChipText: {
      color: theme.colors.text1,
      fontWeight: '700',
    },
    choiceChipTextActive: {
      color: '#FFFFFF',
    },
    dayGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      marginBottom: 18,
    },
    dayChip: {
      width: '22%',
      minWidth: 68,
      alignItems: 'center',
      paddingVertical: 12,
      borderRadius: 18,
      backgroundColor: withOpacity(theme.colors.card, theme.dark ? 0.34 : 0.38),
    },
    dayChipActive: {
      backgroundColor: theme.colors.text2,
    },
    dayChipText: {
      color: theme.colors.text1,
      fontWeight: '700',
    },
    dayChipTextActive: {
      color: '#FFFFFF',
    },
    primaryButton: {
      backgroundColor: theme.colors.primary,
      borderRadius: 18,
      paddingVertical: 16,
      alignItems: 'center',
      marginTop: 4,
    },
    primaryButtonText: {
      color: '#FFFFFF',
      fontSize: 15,
      fontWeight: '800',
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: withOpacity(theme.colors.secondary1, theme.dark ? 0.72 : 0.32),
      justifyContent: 'flex-end',
    },
    deadlineModalCard: {
      backgroundColor: withOpacity(theme.colors.background, theme.dark ? 0.95 : 0.98),
      borderTopLeftRadius: 30,
      borderTopRightRadius: 30,
      paddingHorizontal: 20,
      paddingTop: 14,
      paddingBottom: 24,
    },
    modalHandle: {
      width: 52,
      height: 5,
      borderRadius: 999,
      backgroundColor: withOpacity(theme.colors.text2, theme.dark ? 0.48 : 0.28),
      alignSelf: 'center',
      marginBottom: 18,
    },
    deadlineModalTitle: {
      color: theme.colors.text1,
      fontSize: 20,
      fontWeight: '800',
      marginBottom: 6,
    },
    deadlineModalSubtitle: {
      color: theme.colors.text2,
      fontSize: 13,
      fontWeight: '600',
      lineHeight: 20,
      marginBottom: 16,
    },
    deadlinePickerFrame: {
      height: 260,
      justifyContent: 'center',
      marginBottom: 18,
      borderRadius: 24,
      backgroundColor: withOpacity(theme.colors.background, theme.dark ? 0.2 : 0.95),
      overflow: 'hidden',
    },
    nativeDatePicker: {
      height: 260,
      alignSelf: 'stretch',
    },
    bulletText: {
      color: theme.colors.text2,
      lineHeight: 22,
      marginBottom: 8,
      fontSize: 14,
    },
  })
