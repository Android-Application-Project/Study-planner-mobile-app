import { StyleSheet, Text, TouchableOpacity, Dimensions, View, ScrollView } from 'react-native'
import { useState, useMemo } from 'react'
import { LineChart, PieChart, BarChart } from 'react-native-chart-kit'
import { useTheme } from '../utils/ThemeContext'
import { Theme, themes } from 'src/utils/Themes'
import { useSessions } from 'src/utils/FetchSessions'

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
  const styles = createStyles(theme)

  const { sessions, loading } = useSessions()
  const [tooltip, setTooltip] = useState({ visible: false, value: 0, x: 0, y: 0 })

  const lineChartConfig = {
    backgroundGradientFrom: theme.colors.background,
    backgroundGradientTo: theme.colors.background,
    decimalPlaces: 0, 
    color: (opacity = 1) => `rgba(53, 79, 82, ${opacity})`,
    labelColor: (opacity = 1) => theme.colors.text1,
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
  }
  
  const StatCard = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      <View style={styles.chartWrapper}>{children}</View>
    </View>
  )

  const lineData = useMemo(() => {
    if (sessions.length === 0) return { labels: [], data: [] }
    const dailyMinutes = getDailyMinutes(sessions)
    return formatChartData(dailyMinutes)
  }, [sessions])

  const pieData = useMemo(() => {
    return getSessionStats(sessions)
  }, [sessions])

  const barData = useMemo(() => {
    if (sessions.length === 0) return null

    const countsByDate = getSessionCounts(sessions)
    const sortedDates = Object.keys(countsByDate).sort()

    return {
      labels: sortedDates.map(dateStr => {
        const [y, m, d] = dateStr.split('-').map(Number)
        const dateObj = new Date(y, m - 1, d)

        const todayStr = new Date().toISOString().split('T')[0]
        return dateStr === todayStr
          ? 'Today'
          : dateObj.toLocaleDateString(
            'en-GB', {
              day: 'numeric',
              month: 'short'
            }
          )
      }),
      datasets: [
        {
          data: sortedDates.map(date => countsByDate[date])
        }
      ]
    }
  }, [sessions])

  const maxSessions = useMemo(() => {
    if (!barData) return 1
    const vals = barData.datasets[0].data
    return Math.max(...vals, 1)
  }, [barData])

  const deadlineProgress = useMemo(() => {
    const groups = groupByTitle(sessions)

    return Object.keys(groups).map(title => {
      const progress = getDeadlineProgress(groups[title])

      return { title, ...progress }
    })
  }, [sessions])

  const segments = maxSessions < 15 ? maxSessions : 10

  if (loading) return <View style={styles.container}><Text>Loading stats...</Text></View>;

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
    return sessions.reduce((acc, s) => {
        if (s.completed) acc.completed++
        else if (s.skipped) acc.skipped++  
        else acc.upComming++
        return acc
    }, { completed: 0, skipped: 0, upComming: 0 })
  }

  function getSessionCounts(sessions: SmartScheduleSessions[]) {
    const result: Record<string, number> = {}
    const today = new Date()

    for (let i = -2; i <= 2; i++) {
      const day = new Date()
      day.setDate(today.getDate() + i)
      const dateStr = day.toISOString().split('T')[0]
      result[dateStr] = 0
    }

    sessions.forEach(session => {
      if (result[session.date] !== undefined) {
        result[session.date] += 1
      }
    })

    return result
  }

  function getDeadlineProgress(sessions: SmartScheduleSessions[]) {
    let completedMinutes = 0
    let totalMinutes = 0

    sessions.forEach(session => {
      totalMinutes += session.minutes
      if (session.completed) completedMinutes += session.minutes
    })

    const progress = totalMinutes == 0
      ? 0
      : completedMinutes / totalMinutes

    return { completedMinutes, totalMinutes, progress }
  }

  function groupByTitle(sessions: SmartScheduleSessions[]) {
    const result: Record<string, SmartScheduleSessions[]> = {}

    sessions.forEach(session => {
      if (!result[session.title]) result[session.title] = []
      result[session.title].push(session)
    })

    return result
  }

  function ProgressBar({ progress }: { progress: number}) {
  return (
    <View style={{ margin: 20 }}>
      <View
        style={{
          height: 15,
          width: "100%",
          backgroundColor: "#eee",
          borderRadius: 10,
          overflow: "hidden"
        }}
      >
        <View
          style={{
            height: "100%",
            width: `${progress * 100}%`,
            backgroundColor: theme.colors.text1
          }}
        />
      </View>
    </View>
  );
}

  function getColor(progress: number) {
    if (progress < 0.3) return "#F44336";
    if (progress < 0.7) return "#eeb408";
    return "#4CAF50";
  }



  return ( 
    <ScrollView contentContainerStyle={{ paddingHorizontal: 20 }}>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Deadline Progress</Text>
        {deadlineProgress.map((item, index) => (
          <View key={index} style={styles.progressCard}>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center"
              }}
            >
              <Text style={{ fontWeight: "bold" }}>
                {item.title}
              </Text>

              <Text style={{ fontWeight: "bold", color: getColor(item.progress) }}>
                {Math.round(item.progress * 100)}%
              </Text>
            </View>
            <ProgressBar progress={item.progress} />
          </View>
        ))}
      </View>

      <StatCard title='Session load (5 current days)'>
        {barData ? (
          <BarChart
            data={barData}
            width={screenWidth - 60}
            height={220}
            segments={segments}
            yAxisLabel=''
            yAxisSuffix=''
            fromZero={true}
            showValuesOnTopOfBars={true}
            chartConfig={{
              backgroundGradientFrom: theme.colors.background,
              backgroundGradientTo: theme.colors.background,
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(53, 79, 82, ${opacity})`,
              labelColor: (opacity = 1) => theme.colors.text1,
              barPercentage: 0.6,
            }}
            style={{ marginVertical: 8, borderRadius: 16, marginRight: 40 }}
          />
        ) : (
          <Text style={styles.noData}>No sessions found in schedule.</Text>
        )}
      </StatCard>

      <StatCard title='Study minutes (Past 7 days)'>
        {lineData.data.length > 0 ? (
          <View>
            <LineChart
              data={{
                labels: lineData.labels,
                datasets: [{ data: lineData.data }] 
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
              {
                name: 'Up comming',
                population: pieData.upComming,
                color: '#936944',
                legendFontColor: theme.colors.text1,
                legendFontSize: 12,
              },
            ]}
            width={screenWidth - 60}
            height={180}
            accessor="population"
            backgroundColor="transparent"
            paddingLeft="5"
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
  )
}

const createStyles = (theme: Theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text1,
    marginBottom: 20,
    textAlign: 'center',
  },
  card: {
    padding: 16,
    marginBottom: 20,
    borderBottomColor: theme.colors.text1,
    borderBottomWidth: 2,
    // shadowColor: '#000',
    // shadowOffset: { width: 0, height: 4 },
    // shadowOpacity: 0.1,
    // shadowRadius: 8,
    // backgroundColor: theme.colors.card,
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
  progressCard: {
    marginBottom: 10,
    marginHorizontal: 20
  }
})