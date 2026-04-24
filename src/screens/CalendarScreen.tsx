import React, { useEffect, useMemo, useState } from 'react'
import {
  Alert,
  FlatList,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { Calendar } from 'react-native-calendars'
import { doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore'
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import DateTimePicker from '@react-native-community/datetimepicker'
import { useTheme } from '../utils/ThemeContext'
import { Theme } from '../utils/Themes'
import { auth, db } from '../../firebaseConfig'
import { syncScheduleNotificationsAsync } from '../utils/Notifications'

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

type Session = {
  id?: string
  date: string
  start: string
  end: string
  title: string
  room?: string
  icons?: string
  focusType?: string
  completed?: boolean
  skipped?: boolean
  notificationId?: string | null
  manuallyRescheduled?: boolean
}

type SubjectSchedule = {
  id: string
  subjectName: string
  deadline: string
  pomodoroMinutes?: number
  difficulty?: number
  importance?: number
  readiness?: number
  selectedDays?: string[]
  sessionDensity?: number
  sessions: Session[]
}

type Task = {
  id: string
  subjectId: string
  sessionId: string
  date: string
  start: string
  end: string
  time: string
  title: string
  completed: boolean
  skipped: boolean
  deadline: string
  pomodoroMinutes: number
  difficulty: number
  importance: number
  manuallyRescheduled: boolean
}

const formatDate = (date: Date) => {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

const formatTime = (date: Date) =>
  `${date.getHours().toString().padStart(2, '0')}:${date
    .getMinutes()
    .toString()
    .padStart(2, '0')}`

const parseSessionDateTime = (dateStr: string, timeStr: string) => {
  const [year, month, day] = dateStr.split('-').map(Number)
  const [hour, minute] = timeStr.split(':').map(Number)
  return new Date(year, month - 1, day, hour, minute, 0, 0)
}

const getDurationMinutes = (start: string, end: string) => {
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  const diff = eh * 60 + em - (sh * 60 + sm)
  return diff > 0 ? diff : 25
}

const toMinutes = (time: string) => {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

const addMinutesToTime = (time: string, minutesToAdd: number) => {
  const [hours, minutes] = time.split(':').map(Number)
  const totalMinutes = hours * 60 + minutes + minutesToAdd
  const safe = ((totalMinutes % (24 * 60)) + 24 * 60) % (24 * 60)
  const hh = Math.floor(safe / 60)
  const mm = safe % 60
  return `${hh.toString().padStart(2, '0')}:${mm.toString().padStart(2, '0')}`
}

const todayString = () => formatDate(new Date())

const getSessionKey = (scheduleId: string, session: Session) =>
  `${scheduleId}-${session.id ?? `${session.date}-${session.start}`}`

export default function CalendarScreen() {
  const [selected, setSelected] = useState(formatDate(new Date()))
  const [tasks, setTasks] = useState<Task[]>([])
  const [schedules, setSchedules] = useState<SubjectSchedule[]>([])

  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [editDate, setEditDate] = useState<Date>(new Date())
  const [editTime, setEditTime] = useState<Date>(new Date())
  const [showAndroidDatePicker, setShowAndroidDatePicker] = useState(false)
  const [showAndroidTimePicker, setShowAndroidTimePicker] = useState(false)
  const [savingReschedule, setSavingReschedule] = useState(false)

  const { theme } = useTheme()
  const styles = useMemo(() => createStyles(theme), [theme])

  useEffect(() => {
    const user = auth.currentUser
    if (!user) return

    const userRef = doc(db, 'users', user.uid)
    const unsubscribe = onSnapshot(userRef, async (snapshot) => {
      if (!snapshot.exists()) {
        setTasks([])
        setSchedules([])
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

      const activeSchedules = rawSchedules.filter((item) => item.deadline >= todayString())
      setSchedules(activeSchedules)

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

      const mappedTasks = activeSchedules
        .flatMap((schedule) =>
          (schedule.sessions ?? []).map((item) => ({
            id: getSessionKey(schedule.id, item),
            subjectId: schedule.id,
            sessionId: item.id ?? `${item.date}-${item.start}`,
            date: item.date,
            start: item.start,
            end: item.end,
            time: `${item.start} - ${item.end}`,
            title: item.title,
            completed: !!item.completed,
            skipped: !!item.skipped,
            deadline: schedule.deadline,
            pomodoroMinutes: schedule.pomodoroMinutes ?? 0,
            difficulty: schedule.difficulty ?? 0,
            importance: schedule.importance ?? 0,
            manuallyRescheduled: !!item.manuallyRescheduled,
          })),
        )
        .filter((item) => item.date && item.start && item.end && item.title)
        .sort((first, second) => {
          const firstKey = `${first.date} ${first.start}`
          const secondKey = `${second.date} ${second.start}`
          return firstKey.localeCompare(secondKey)
        })

      setTasks(mappedTasks)
    })

    return () => unsubscribe()
  }, [])

  const persistSchedules = async (nextSchedules: SubjectSchedule[]) => {
    const user = auth.currentUser
    if (!user) return

    await setDoc(
      doc(db, 'users', user.uid),
      {
        smartSchedules: nextSchedules,
        smartScheduleUpdatedAt: serverTimestamp(),
      },
      { merge: true },
    )
  }

  const handleComplete = async (task: Task) => {
    const nextSchedules = schedules.map((schedule) =>
      schedule.id !== task.subjectId
        ? schedule
        : {
            ...schedule,
            sessions: schedule.sessions.map((session) =>
              getSessionKey(schedule.id, session) === task.id
                ? { ...session, completed: !session.completed, skipped: false }
                : session,
            ),
          },
    )

    try {
      const targetSchedule = nextSchedules.find((schedule) => schedule.id === task.subjectId)
      const syncedSchedule = targetSchedule ? await syncScheduleNotificationsAsync(targetSchedule) : null
      const finalSchedules = nextSchedules.map((schedule) =>
        schedule.id === syncedSchedule?.id ? syncedSchedule : schedule,
      )
      await persistSchedules(finalSchedules)
    } catch (error) {
      console.error('Error updating completion:', error)
      Alert.alert('Update failed', 'Could not update this session right now.')
    }
  }

  const handleSkip = async (task: Task) => {
    const nextSchedules = schedules.map((schedule) =>
      schedule.id !== task.subjectId
        ? schedule
        : {
            ...schedule,
            sessions: schedule.sessions.map((session) =>
              getSessionKey(schedule.id, session) === task.id
                ? { ...session, skipped: !session.skipped, completed: false }
                : session,
            ),
          },
    )

    try {
      const targetSchedule = nextSchedules.find((schedule) => schedule.id === task.subjectId)
      const syncedSchedule = targetSchedule ? await syncScheduleNotificationsAsync(targetSchedule) : null
      const finalSchedules = nextSchedules.map((schedule) =>
        schedule.id === syncedSchedule?.id ? syncedSchedule : schedule,
      )
      await persistSchedules(finalSchedules)
    } catch (error) {
      console.error('Error skipping session:', error)
      Alert.alert('Skip failed', 'Could not skip this pomodoro right now.')
    }
  }

  const openReschedule = (task: Task) => {
    const initial = parseSessionDateTime(task.date, task.start)
    setEditingTask(task)
    setEditDate(initial)
    setEditTime(initial)
    setShowAndroidDatePicker(false)
    setShowAndroidTimePicker(false)
  }

  const closeReschedule = () => {
    if (savingReschedule) return
    setEditingTask(null)
    setShowAndroidDatePicker(false)
    setShowAndroidTimePicker(false)
  }

  const handleSaveReschedule = async () => {
    if (!editingTask) return

    const newDate = formatDate(editDate)
    const newStart = formatTime(editTime)
    const duration = getDurationMinutes(editingTask.start, editingTask.end)
    const newEnd = addMinutesToTime(newStart, duration)

    const newStartMin = toMinutes(newStart)
    const newEndMin = toMinutes(newEnd)

    const conflictingTask = tasks.find((other) => {
      if (other.id === editingTask.id) return false
      if (other.date !== newDate) return false
      if (other.completed || other.skipped) return false
      const otherStart = toMinutes(other.start)
      const otherEnd = toMinutes(other.end)
      return newStartMin < otherEnd && otherStart < newEndMin
    })

    if (conflictingTask) {
      Alert.alert(
        'Time conflict',
        `This slot overlaps with "${conflictingTask.title}" on ${conflictingTask.date} (${conflictingTask.time}). Please pick a different date or start time.`,
      )
      return
    }

    const nextSchedules = schedules.map((schedule) =>
      schedule.id !== editingTask.subjectId
        ? schedule
        : {
            ...schedule,
            sessions: schedule.sessions.map((session) =>
              getSessionKey(schedule.id, session) === editingTask.id
                ? {
                    ...session,
                    date: newDate,
                    start: newStart,
                    end: newEnd,
                    manuallyRescheduled: true,
                  }
                : session,
            ),
          },
    )

    try {
      setSavingReschedule(true)
      const targetSchedule = nextSchedules.find((schedule) => schedule.id === editingTask.subjectId)
      const syncedSchedule = targetSchedule ? await syncScheduleNotificationsAsync(targetSchedule) : null
      const finalSchedules = nextSchedules.map((schedule) =>
        schedule.id === syncedSchedule?.id ? syncedSchedule : schedule,
      )
      await persistSchedules(finalSchedules)
      setSelected(newDate)
      setEditingTask(null)
    } catch (error) {
      console.error('Error rescheduling:', error)
      Alert.alert('Update failed', 'Could not move this session right now.')
    } finally {
      setSavingReschedule(false)
    }
  }

  const tasksForSelectedDay = useMemo(
    () => tasks.filter((item) => item.date === selected),
    [selected, tasks],
  )

  const markedDates = useMemo(() => {
    const marks: Record<string, any> = {
      [selected]: {
        selected: true,
        selectedColor: '#A0B99B',
      },
    }

    tasks.forEach((item) => {
      const current = marks[item.date] ?? {}
      marks[item.date] = {
        ...current,
        marked: true,
        dotColor: item.completed
          ? '#7A8F72'
          : item.skipped
            ? '#B0B7C3'
            : current.selected
              ? '#FFFFFF'
              : theme.colors.primary,
      }
    })

    return marks
  }, [selected, tasks, theme.colors.primary])

  const renderTask = ({ item }: { item: Task }) => (
    <View
      style={[
        styles.taskCard,
        item.completed && styles.taskCardCompleted,
        item.skipped && styles.taskCardSkipped,
      ]}
    >
      <View
        style={[
          styles.taskIndicator,
          item.completed && styles.taskIndicatorCompleted,
          item.skipped && styles.taskIndicatorSkipped,
        ]}
      />

      <View style={styles.taskContent}>
        <View style={styles.taskHeaderRow}>
          <Text style={styles.taskTime}>{item.time}</Text>
          {item.manuallyRescheduled && (
            <View style={styles.movedBadge}>
              <Ionicons name="swap-horizontal" size={12} color="#FFFFFF" />
              <Text style={styles.movedBadgeText}>Moved</Text>
            </View>
          )}
        </View>
        <Text
          style={[
            styles.taskTitle,
            item.completed && styles.taskTitleCompleted,
            item.skipped && styles.taskTitleSkipped,
          ]}
        >
          {item.title}
        </Text>

        <Text style={styles.taskMeta}>
          Deadline {item.deadline} • Pomodoro {item.pomodoroMinutes}m
        </Text>
        <Text style={styles.taskMeta}>
          Difficulty {item.difficulty}/5 • Importance {item.importance}/5
        </Text>

        <View style={styles.taskActions}>
          <TouchableOpacity
            style={[
              styles.actionButton,
              styles.completeButton,
              item.completed && styles.completeButtonActive,
            ]}
            onPress={() => handleComplete(item)}
          >
            <Ionicons
              name={item.completed ? 'checkmark-circle' : 'checkmark-circle-outline'}
              size={16}
              color={item.completed ? '#FFFFFF' : '#2E6A41'}
            />
            <Text style={[styles.actionText, item.completed && styles.actionTextActive]}>
              {item.completed ? 'Completed' : 'Complete'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.skipButton, item.skipped && styles.skipButtonActive]}
            onPress={() => handleSkip(item)}
          >
            <MaterialCommunityIcons
              name={item.skipped ? 'skip-next-circle' : 'skip-next-circle-outline'}
              size={16}
              color={item.skipped ? '#FFFFFF' : '#6C727F'}
            />
            <Text style={[styles.skipText, item.skipped && styles.skipTextActive]}>
              {item.skipped ? 'Skipped' : 'Skip'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.rescheduleButton]}
            onPress={() => openReschedule(item)}
          >
            <Ionicons name="calendar-outline" size={16} color={theme.colors.primary} />
            <Text style={styles.rescheduleText}>Reschedule</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  )

  return (
    <View style={styles.container}>
      <View style={styles.calendarWrapper}>
        <Calendar
          enableSwipeMonths
          onDayPress={(day) => setSelected(day.dateString)}
          markedDates={markedDates}
          theme={{
            calendarBackground: theme.colors.text2,
            textSectionTitleColor: theme.colors.secondary2,
            dayTextColor: theme.colors.secondary2,
            monthTextColor: theme.colors.secondary2,
            arrowColor: theme.colors.secondary2,
            todayTextColor: '#FFF',
            selectedDayTextColor: '#FFFFFF',
            textDisabledColor: 'rgba(255,255,255,0.3)',
          }}
        />
      </View>

      <View style={styles.listContainer}>
        <Text style={styles.listTitle}>Study Plan for {selected}</Text>
        <Text style={styles.listSubtitle}>
          {tasksForSelectedDay.length > 0
            ? `${tasksForSelectedDay.length} session(s) scheduled`
            : 'No smart schedule sessions on this day yet'}
        </Text>

        <FlatList
          data={tasksForSelectedDay}
          keyExtractor={(item) => item.id}
          renderItem={renderTask}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40, paddingTop: 8 }}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No sessions here</Text>
              <Text style={styles.emptyText}>
                You can still tap any day in the calendar. Days with study sessions only show
                the dot marker and the task list below.
              </Text>
            </View>
          }
        />
      </View>

      <Modal
        animationType="slide"
        transparent
        visible={!!editingTask}
        onRequestClose={closeReschedule}
      >
        <Pressable style={styles.modalOverlay} onPress={closeReschedule}>
          <Pressable style={styles.rescheduleCard} onPress={(event) => event.stopPropagation()}>
            <View style={styles.modalHandle} />
            <Text style={styles.rescheduleModalTitle}>Reschedule session</Text>
            <Text style={styles.rescheduleModalSubtitle}>
              {editingTask
                ? `Pick another date and start time for "${editingTask.title}". The session length stays the same.`
                : ''}
            </Text>

            {Platform.OS === 'ios' ? (
              <>
                <Text style={styles.fieldLabel}>New date</Text>
                <View style={styles.pickerFrame}>
                  <DateTimePicker
                    value={editDate}
                    mode="date"
                    display="spinner"
                    onChange={(_, d) => d && setEditDate(d)}
                    textColor={theme.colors.text1}
                    accentColor={theme.colors.primary}
                    style={styles.iosPicker}
                  />
                </View>

                <Text style={styles.fieldLabel}>New start time</Text>
                <View style={styles.pickerFrame}>
                  <DateTimePicker
                    value={editTime}
                    mode="time"
                    display="spinner"
                    onChange={(_, d) => d && setEditTime(d)}
                    textColor={theme.colors.text1}
                    accentColor={theme.colors.primary}
                    style={styles.iosPicker}
                  />
                </View>
              </>
            ) : (
              <>
                <TouchableOpacity
                  style={styles.selectorButton}
                  onPress={() => setShowAndroidDatePicker(true)}
                >
                  <View>
                    <Text style={styles.selectorLabel}>New date</Text>
                    <Text style={styles.selectorValue}>{formatDate(editDate)}</Text>
                  </View>
                  <Text style={styles.selectorHint}>Change</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.selectorButton}
                  onPress={() => setShowAndroidTimePicker(true)}
                >
                  <View>
                    <Text style={styles.selectorLabel}>New start time</Text>
                    <Text style={styles.selectorValue}>{formatTime(editTime)}</Text>
                  </View>
                  <Text style={styles.selectorHint}>Change</Text>
                </TouchableOpacity>

                {showAndroidDatePicker && (
                  <DateTimePicker
                    value={editDate}
                    mode="date"
                    onChange={(_, d) => {
                      setShowAndroidDatePicker(false)
                      if (d) setEditDate(d)
                    }}
                  />
                )}
                {showAndroidTimePicker && (
                  <DateTimePicker
                    value={editTime}
                    mode="time"
                    is24Hour
                    onChange={(_, d) => {
                      setShowAndroidTimePicker(false)
                      if (d) setEditTime(d)
                    }}
                  />
                )}
              </>
            )}

            <TouchableOpacity
              style={[styles.saveButton, savingReschedule && styles.saveButtonDisabled]}
              onPress={handleSaveReschedule}
              disabled={savingReschedule}
            >
              <Text style={styles.saveButtonText}>
                {savingReschedule ? 'Saving…' : 'Save new time'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelButton} onPress={closeReschedule}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  )
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    calendarWrapper: {
      backgroundColor: theme.colors.text2,
      borderBottomLeftRadius: 35,
      borderBottomRightRadius: 35,
      paddingTop: 20,
      paddingBottom: 15,
      overflow: 'hidden',
    },
    listContainer: {
      flex: 1,
      paddingHorizontal: 24,
      paddingTop: 24,
    },
    listTitle: {
      color: theme.colors.text1,
      fontSize: 22,
      fontWeight: '800',
      marginBottom: 6,
    },
    listSubtitle: {
      color: theme.colors.text2,
      marginBottom: 12,
      fontWeight: '600',
    },
    taskCard: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: 16,
      borderRadius: 22,
      backgroundColor: withOpacity(theme.colors.background, theme.dark ? 0.28 : 0.95),
      padding: 16,
      borderWidth: 1,
      borderColor: withOpacity(theme.colors.text2, theme.dark ? 0.28 : 0.12),
    },
    taskCardCompleted: {
      backgroundColor: withOpacity(theme.colors.primary, theme.dark ? 0.22 : 0.16),
    },
    taskCardSkipped: {
      backgroundColor: withOpacity(theme.colors.text2, theme.dark ? 0.22 : 0.14),
    },
    taskIndicator: {
      width: 4,
      alignSelf: 'stretch',
      backgroundColor: withOpacity(theme.colors.primary, theme.dark ? 0.75 : 0.55),
      marginRight: 15,
      borderRadius: 4,
    },
    taskIndicatorCompleted: {
      backgroundColor: theme.colors.primary,
    },
    taskIndicatorSkipped: {
      backgroundColor: theme.colors.text2,
    },
    taskContent: {
      flex: 1,
    },
    taskTime: {
      fontSize: 14,
      color: theme.colors.text2,
      marginBottom: 4,
      fontWeight: '600',
    },
    taskTitle: {
      fontSize: 16,
      fontWeight: 'bold',
      color: theme.colors.text1,
      marginBottom: 6,
    },
    taskTitleCompleted: {
      color: theme.colors.text2,
      textDecorationLine: 'line-through',
    },
    taskTitleSkipped: {
      color: withOpacity(theme.colors.text1, theme.dark ? 0.7 : 0.68),
    },
    taskMeta: {
      color: theme.colors.text2,
      fontSize: 13,
      fontWeight: '600',
      marginBottom: 4,
    },
    taskActions: {
      flexDirection: 'row',
      gap: 10,
      flexWrap: 'wrap',
      marginTop: 8,
    },
    actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 14,
    },
    completeButton: {
      backgroundColor: withOpacity(theme.colors.primary, theme.dark ? 0.24 : 0.16),
    },
    completeButtonActive: {
      backgroundColor: theme.colors.primary,
    },
    skipButton: {
      backgroundColor: withOpacity(theme.colors.text2, theme.dark ? 0.26 : 0.14),
    },
    skipButtonActive: {
      backgroundColor: theme.colors.text2,
    },
    actionText: {
      marginLeft: 6,
      color: theme.colors.primary,
      fontWeight: '800',
      fontSize: 13,
    },
    actionTextActive: {
      color: '#FFFFFF',
    },
    skipText: {
      marginLeft: 6,
      color: theme.colors.text2,
      fontWeight: '800',
      fontSize: 13,
    },
    skipTextActive: {
      color: '#FFFFFF',
    },
    emptyState: {
      alignItems: 'center',
      paddingVertical: 40,
      paddingHorizontal: 20,
    },
    emptyTitle: {
      color: theme.colors.text1,
      fontSize: 18,
      fontWeight: '800',
      marginBottom: 8,
    },
    emptyText: {
      color: theme.colors.text2,
      textAlign: 'center',
      lineHeight: 21,
    },
    taskHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 4,
    },
    movedBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 999,
      backgroundColor: theme.colors.primary,
    },
    movedBadgeText: {
      color: '#FFFFFF',
      fontSize: 11,
      fontWeight: '800',
      letterSpacing: 0.3,
    },
    rescheduleButton: {
      backgroundColor: withOpacity(theme.colors.primary, theme.dark ? 0.18 : 0.12),
    },
    rescheduleText: {
      marginLeft: 6,
      color: theme.colors.primary,
      fontWeight: '800',
      fontSize: 13,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: withOpacity(theme.colors.secondary1, theme.dark ? 0.72 : 0.32),
      justifyContent: 'flex-end',
    },
    rescheduleCard: {
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
      marginBottom: 16,
    },
    rescheduleModalTitle: {
      color: theme.colors.text1,
      fontSize: 20,
      fontWeight: '800',
      marginBottom: 6,
    },
    rescheduleModalSubtitle: {
      color: theme.colors.text2,
      fontSize: 13,
      fontWeight: '600',
      lineHeight: 20,
      marginBottom: 14,
    },
    fieldLabel: {
      color: theme.colors.text1,
      fontSize: 13,
      fontWeight: '700',
      marginTop: 8,
      marginBottom: 6,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
    },
    pickerFrame: {
      borderRadius: 20,
      backgroundColor: withOpacity(theme.colors.background, theme.dark ? 0.2 : 0.95),
      overflow: 'hidden',
      marginBottom: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    iosPicker: {
      alignSelf: 'stretch',
      height: 160,
    },
    selectorButton: {
      borderRadius: 16,
      backgroundColor: withOpacity(theme.colors.background, theme.dark ? 0.28 : 0.92),
      borderWidth: 1,
      borderColor: withOpacity(theme.colors.text2, theme.dark ? 0.45 : 0.2),
      paddingHorizontal: 16,
      paddingVertical: 14,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 10,
    },
    selectorLabel: {
      color: theme.colors.primary,
      fontSize: 12,
      fontWeight: '700',
      marginBottom: 2,
      textTransform: 'uppercase',
      letterSpacing: 0.9,
    },
    selectorValue: {
      color: theme.colors.text1,
      fontSize: 16,
      fontWeight: '800',
    },
    selectorHint: {
      color: theme.colors.primary,
      fontWeight: '800',
      fontSize: 13,
    },
    saveButton: {
      backgroundColor: theme.colors.primary,
      borderRadius: 18,
      paddingVertical: 16,
      alignItems: 'center',
      marginTop: 12,
    },
    saveButtonDisabled: {
      opacity: 0.6,
    },
    saveButtonText: {
      color: '#FFFFFF',
      fontSize: 15,
      fontWeight: '800',
    },
    cancelButton: {
      paddingVertical: 12,
      alignItems: 'center',
      marginTop: 4,
    },
    cancelButtonText: {
      color: theme.colors.text2,
      fontSize: 14,
      fontWeight: '700',
    },
  })
