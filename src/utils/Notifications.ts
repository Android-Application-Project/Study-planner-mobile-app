import { Platform } from 'react-native'
import * as Notifications from 'expo-notifications'

export type NotificationSession = {
  id?: string
  date?: string
  start?: string
  end?: string
  title?: string
  completed?: boolean
  skipped?: boolean
  notificationId?: string | null
}

export type NotificationSchedule<TSession extends NotificationSession = NotificationSession> = {
  id: string
  subjectName: string
  pomodoroMinutes?: number
  sessions: TSession[]
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
})

const parseSessionDateTime = (dateString: string, timeString: string) => {
  const [year, month, day] = dateString.split('-').map(Number)
  const [hours, minutes] = timeString.split(':').map(Number)
  return new Date(year, month - 1, day, hours, minutes, 0, 0)
}

export const ensureNotificationPermissionsAsync = async () => {
  const settings = await Notifications.getPermissionsAsync()
  if (settings.granted || settings.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) {
    return true
  }

  const requested = await Notifications.requestPermissionsAsync({
    ios: {
      allowAlert: true,
      allowBadge: true,
      allowSound: true,
    },
  })

  return (
    requested.granted ||
    requested.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL
  )
}

export const configureNotificationChannelAsync = async () => {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('study-reminders', {
      name: 'Study reminders',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      sound: 'default',
    })
  }
}

export const cancelScheduleNotificationsAsync = async (schedule?: NotificationSchedule | null) => {
  if (!schedule) return

  await Promise.all(
    (schedule.sessions ?? [])
      .map((session) => session.notificationId)
      .filter((value): value is string => Boolean(value))
      .map((id) => Notifications.cancelScheduledNotificationAsync(id)),
  )
}

const scheduleSessionNotificationAsync = async (
  subjectName: string,
  session: NotificationSession,
  pomodoroMinutes?: number,
) => {
  if (!session.date || !session.start) {
    return null
  }

  const reminderDate = new Date(parseSessionDateTime(session.date, session.start).getTime() - 30 * 60 * 1000)
  if (reminderDate.getTime() <= Date.now()) {
    return null
  }

  return Notifications.scheduleNotificationAsync({
    content: {
      title: `Pomodoro in 30 minutes`,
      body: `${subjectName} starts at ${session.start}${pomodoroMinutes ? ` • ${pomodoroMinutes} minutes` : ''}`,
      sound: 'default',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: reminderDate,
      channelId: Platform.OS === 'android' ? 'study-reminders' : undefined,
    },
  })
}

export const syncScheduleNotificationsAsync = async <
  TSession extends NotificationSession,
  TSchedule extends NotificationSchedule<TSession>,
>(
  schedule: TSchedule,
): Promise<TSchedule> => {
  const hasPermission = await ensureNotificationPermissionsAsync()
  await configureNotificationChannelAsync()

  await cancelScheduleNotificationsAsync(schedule)

  if (!hasPermission) {
    return {
      ...schedule,
      sessions: schedule.sessions.map((session) => ({
        ...session,
        notificationId: null,
      })),
    }
  }

  const nextSessions: TSession[] = []
  for (const session of schedule.sessions) {
    if (session.completed || session.skipped) {
      nextSessions.push({ ...session, notificationId: null } as TSession)
      continue
    }

    const notificationId = await scheduleSessionNotificationAsync(
      schedule.subjectName,
      session,
      schedule.pomodoroMinutes,
    )

    nextSessions.push({
      ...session,
      notificationId,
    } as TSession)
  }

  return {
    ...schedule,
    sessions: nextSessions,
  }
}
