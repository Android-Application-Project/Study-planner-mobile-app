import React, { useState, useMemo } from 'react';
import { View, StyleSheet, Text, FlatList } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { useTheme } from '../utils/ThemeProvider';
import { themes, Theme } from '../utils/Themes';

type Task = {
  id: string;
  time: string;
  title: string;
  room: string;
  icons: string;
};

export default function SimpleCalendarScreen() {
  const [selected, setSelected] = useState('');

  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const mockTasks: Task[] = [
    { id: '1', time: '08:00 - 10:00', title: 'Practice English', room: 'Lavender room', icons: '🐸 🐷' },
    { id: '2', time: '14:00 - 16:00', title: 'Practice Finnish', room: '', icons: '🐱' }
  ]

  const renderTask = ({item} : {item: Task}) => (
    <View style = {styles.taskCard}>
      <View style = {styles.taskIndicator}/> 

      <View style = {styles.taskContent}>
        <Text style={styles.taskTime}>{item.time}</Text>
        <Text style={styles.taskTitle}>{item.title}</Text>
        {item.room ? <Text style={styles.taskRoom}>{item.room}</Text> : null}
      </View>

      <Text style={styles.taskIcon}>{item.icons}</Text>
    </View>
  )

return (
    <View style={styles.container}>
      <View style={styles.calendarWrapper}>
        <Calendar
          onDayPress={(day) => setSelected(day.dateString)}
          markedDates={{
            [selected]: { selected: true, selectedColor: '#A0B99B' }
          }}
          theme={{
            calendarBackground: theme.colors.text2,
            textSectionTitleColor: theme.colors.secondary2,
            dayTextColor: theme.colors.secondary2,
            monthTextColor: theme.colors.secondary2,
            arrowColor: theme.colors.secondary2,
            todayTextColor: '#FFF',
          }}
        />
      </View>

      <View style={styles.listContainer}>
        <FlatList
          data={mockTasks}
          keyExtractor={(item) => item.id}
          renderItem={renderTask}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
        />
      </View>

    </View>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: theme.colors.background 
  },
  calendarWrapper: {
    backgroundColor: theme.colors.text2, 
    borderBottomLeftRadius: 35,
    borderBottomRightRadius: 35,
    paddingTop: 40, 
    paddingBottom: 15,
    overflow: 'hidden',
  },
  listContainer: {
    flex: 1,
    paddingHorizontal: 30,
    paddingTop: 30,
  },
  taskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 25,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.primary, 
    paddingBottom: 15,
  },
  taskIndicator: {
    width: 3,
    height: '80%',
    backgroundColor: '#D8B28E', 
    marginRight: 15,
    borderRadius: 2,
  },
  taskContent: {
    flex: 1,
  },
  taskTime: {
    fontSize: 14,
    color: theme.colors.text2, 
    marginBottom: 2,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text1, 
    marginBottom: 2,
  },
  taskRoom: {
    fontSize: 14,
    color: theme.colors.primary, 
    fontWeight: '500',
  },
  taskIcon: {
    fontSize: 28, 
    marginLeft: 10,
  }
});