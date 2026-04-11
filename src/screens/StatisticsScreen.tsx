import { StyleSheet, Text, View } from 'react-native'
import { useState, useEffect } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import { db, auth } from '../../firebaseConfig'
import { LineChart, PieChart } from 'react-native-chart-kit'
import { Dimensions } from 'react-native'
import { useTheme } from '../utils/ThemeContext'
import { SafeAreaView } from 'react-native-safe-area-context'

const screenWidth = Dimensions.get('window').width

type SmartScheduleSessions = {
  completed: boolean
  date: string
  day: string
  end: string
  focusType: string
  icons: string
  minutes: number
  notificationId: string
  room: string
  skipped: boolean
  title: string
}

export default function StatisticsScreen() {
  const { theme } = useTheme()
  const uid = auth.currentUser?.uid;

  const [chartData, setChartData] = useState<{ labels: string[]; data: number[] }>({
    labels: [],
    data: []
  })

  const [pieData, setPieData] = useState<({ completed: number, skipped: number })>({ completed: 0, skipped: 0 })

  useEffect(() => {
    const loadData = async () => {
      if (!uid) return

      const sessions = await getSchedule(uid)

      if (!Array.isArray(sessions)) return
      
      const dailyMinutes = getDailyMinutes(sessions)
      const chartData = formatChartData(dailyMinutes)
      
      setChartData(chartData)

      const stats = getSessionStats(sessions)
      setPieData(stats)
    }
    loadData()
  }, [uid])

async function getSchedule(uid: string) {
  const ref = doc(db, 'users', uid)
  const snapShot = await getDoc(ref)

  if (!snapShot.exists()) return []
  const data = snapShot.data()

  const smartSchedule = data.smartSchedules || []

  const sessions = smartSchedule.flatMap(
    (schedule: any) => schedule.sessions || []
  ) 

  return sessions || []
}

function getDailyMinutes(sessions: SmartScheduleSessions[]) {
  const result: Record<string, number> = {}

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  sessions.forEach(session => {
    const minutes = Number(session.minutes)

    const sessionDate = new Date(session.date)

    if (sessionDate > today && !Number.isNaN(minutes)) {
      result[session.date] = (result[session.date] || 0) + minutes
    }
  })

  return result

}

function formatChartData(dailyMinutes: Record<string, number>) {
  const labels = Object.keys(dailyMinutes)
  const data = Object.values(dailyMinutes)

  return { labels, data }
}

function getSessionStats(sessions: SmartScheduleSessions[]) {
  let completed = 0
  let skipped = 0

  sessions.forEach(s => {
    if (s.completed === true) completed++
    if (s.skipped === true) skipped++
  })

  return { completed, skipped }
}

  return (
    <SafeAreaView>
      <Text>StatisticsScreen</Text>
      <Text>Minutes per day</Text>
      {chartData.data.length > 0 ? (
        <LineChart
          data={{
            labels: chartData.labels,
            datasets: [{ data: chartData.data }] 
          }}
          width={screenWidth}
          height={220}
          chartConfig={{
            backgroundColor: theme.colors.background,
            backgroundGradientFrom: theme.colors.background,
            backgroundGradientTo: theme.colors.background,
            color: (opacity = 1) => theme.colors.text1,
            labelColor: (opacity = 1) => theme.colors.text1
          }}
        />
      ) : (
        <Text>No data available</Text>
      )}

      <Text>Completion ratio</Text>

      {pieData.completed + pieData.skipped > 0 ? (
        <PieChart
          data={[
            {
              name: "Completed",
              population: pieData.completed,
              color: "#4CAF50",
              legendFontColor: "#7F7F7F",
              legendFontSize: 15
            },
            {
              name: "Skipped",
              population: pieData.skipped,
              color: "#F44336",
              legendFontColor: "#7F7F7F",
              legendFontSize: 15
            }
          ]}
          width={screenWidth}
          height={220}
          accessor="population"
          backgroundColor="transparent"
          paddingLeft="15"
          chartConfig={{
            backgroundColor: theme.colors.background,
            backgroundGradientFrom: theme.colors.background,
            backgroundGradientTo: theme.colors.background,
            color: (opacity = 1) => theme.colors.text1,
            labelColor: (opacity = 1) => theme.colors.text1
          }}
        />
      ) : (
        <Text>No data available</Text>
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({})