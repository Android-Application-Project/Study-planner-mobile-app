import { StyleSheet, Text, TouchableOpacity, Dimensions, View, ScrollView } from 'react-native'
import { useState, useEffect, useMemo } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import { db, auth } from '../../firebaseConfig'
import { LineChart, PieChart } from 'react-native-chart-kit'
import { useTheme } from '../utils/ThemeContext'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Theme } from 'src/utils/Themes'
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
  const styles = createStyles(theme)

  const [chartData, setChartData] = useState<{ labels: string[]; data: number[] }>({
    labels: [],
    data: []
  })

  const [pieData, setPieData] = useState<({ completed: number, skipped: number })>({ completed: 0, skipped: 0 })

  const [tooltip, setTooltip] = useState({
    visible: false,
    value: 0,
    x: 0,
    y: 0,
  })

  const lineChartConfig = {
    backgroundGradientFrom: theme.colors.card,
    backgroundGradientTo: theme.colors.card,
    decimalPlaces: 0, 
    color: (opacity = 1) => `rgba(53, 79, 82, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(53, 79, 82, ${opacity})`,
    style: { borderRadius: 16 },
    propsForDots: {
      r: '6',
      strokeWidth: '2',
      stroke: theme.colors.primary,
    },
    propsForLabels: {
      fontSize: 10,
      dy: 3,
      dx: -10 
    },
  };

  const StatCard = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <View style={styles.card}>
    <Text style={styles.cardTitle}>{title}</Text>
    <View style={styles.chartWrapper}>{children}</View>
  </View>
)

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

    for (let i = 1; i <= 7; i++) {
      const d = new Date()
      d.setDate(today.getDate() - i)
      const dateString = d.toISOString().split('T')[0]
      result[dateString] = 0;
    }

    const sevenDaysAgo = new Date(today)
    sevenDaysAgo.setDate(today.getDate() - 6)

    sessions.forEach(session => {
      if (session.completed && result[session.date] !== undefined) {
        const minutes = Number(session.minutes) || 0;
        result[session.date] += minutes;
      }
    })

    return result

  }

  function formatChartData(dailyMinutes: Record<string, number>) {

    const sortedDates = Object.keys(dailyMinutes).sort()

    const labels = sortedDates.map(dateStr => {
      const [y, m, d] = dateStr.split('-').map(Number);
      const dateObj = new Date(y, m - 1, d);
      return dateObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    });

    const data = sortedDates.map(date => dailyMinutes[date])

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
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.headerTitle}>Learning Analytics</Text>

        <StatCard title='Study minutes (Past 7 days)'>
          {chartData.data.length > 0 ? (
            <View>
              <LineChart
                data={{
                  labels: chartData.labels,
                  datasets: [{ data: chartData.data }] 
                }}
                width={screenWidth - 60}
                height={220}
                chartConfig={lineChartConfig}
                verticalLabelRotation={-30}
                bezier
                style={styles.lineChartStyle}
                onDataPointClick={(data) => {
                  setTooltip({ visible: true, value: data.value, x: data.x, y: data.y });
                }}
              />                  
              {tooltip.visible && (
                <View style={[styles.tooltip, { top: tooltip.y - 40, left: tooltip.x - 5 }]}>
                  <Text style={styles.tooltipText}>{tooltip.value}m</Text>
                </View>
              )}
            </View>
          ) : (
            <Text style={styles.noData}>No activity recorded yet.</Text>
          )}
        </StatCard>

      <StatCard title="Completion Overview">
          {pieData.completed + pieData.skipped > 0 ? (
            <PieChart
              data={[
                {
                  name: 'Done',
                  population: pieData.completed,
                  color: theme.colors.primary,
                  legendFontColor: theme.colors.text1,
                  legendFontSize: 12,
                },
                {
                  name: 'Skipped',
                  population: pieData.skipped,
                  color: '#E67E22',
                  legendFontColor: theme.colors.text1,
                  legendFontSize: 12,
                },
              ]}
              width={screenWidth - 60}
              height={180}
              accessor="population"
              backgroundColor="transparent"
              paddingLeft="15"
              chartConfig={lineChartConfig}
            />
          ) : (
            <Text style={styles.noData}>Complete a session to see stats!</Text>
          )}
        </StatCard>

        {tooltip.visible && (
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            onPress={() => setTooltip({ ...tooltip, visible: false })}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const createStyles = (theme: Theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    padding: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text1,
    marginBottom: 20,
    textAlign: 'center',
  },
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: 24,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text1,
    marginBottom: 15,
    marginLeft: 5,
  },
  chartWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 20
  },
  chartStyle: {
    borderRadius: 16,
  },
  lineChartStyle: {
    borderRadius: 16,
    marginVertical: 8,
    marginLeft: 30,
    marginRight: 10,
    paddingRight: 50,
  },
  noData: {
    color: theme.colors.text2,
    fontStyle: 'italic',
    padding: 20,
  },
  tooltip: {
    position: 'absolute',
    backgroundColor: theme.colors.secondary1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignItems: 'center',
    width: 55,
  },
  tooltipText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
})