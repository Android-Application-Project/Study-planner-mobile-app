import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from 'firebaseConfig'; // Adjust based on your config path

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

export const injectTestDataForGraph = async () => {
  const user = auth.currentUser;
  if (!user) {
    console.error("No user logged in");
    return;
  }

  const today = new Date();
  const sessions: ScheduleSession[] = [];
  const subjectName = "Test Analytics Subject";
  const scheduleId = "test-analytics-id";

  // 1. Generate data for the last 7 days
  for (let i = 0; i < 7; i++) {
    const targetDate = new Date();
    targetDate.setDate(today.getDate() - i);
    
    const dateKey = targetDate.toISOString().split('T')[0]; // YYYY-MM-DD
    
    // Create random minutes between 30 and 120 for the graph
    const randomMinutes = [30, 45, 60, 90, 120][Math.floor(Math.random() * 5)];

    sessions.push({
      id: `test-session-${dateKey}`,
      date: dateKey,
      day: targetDate.toLocaleDateString('en-US', { weekday: 'short' }),
      title: subjectName,
      start: "10:00",
      end: "11:00",
      minutes: randomMinutes,
      focusType: "Practice",
      room: "Testing Lab",
      icons: "+",
      completed: true, // IMPORTANT: Your graph should only count completed sessions
      skipped: false,
    });
  }

  // 2. Prepare the SubjectSchedule payload
  const testPayload: SubjectSchedule = {
    id: scheduleId,
    subjectName: subjectName,
    pomodoroMinutes: 50,
    deadline: today.toISOString().split('T')[0],
    difficulty: 3,
    importance: 3,
    readiness: 3,
    sessionDensity: 1,
    timePreference: 'Afternoon',
    selectedDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    sessions: sessions,
    generatedOn: today.toISOString().split('T')[0],
  };

  // 3. Save to Firebase (Merging with existing schedules)
  try {
    const userRef = doc(db, 'users', user.uid);
    const snapshot = await getDoc(userRef);
    const existingSchedules = snapshot.data()?.smartSchedules || [];
    
    // Remove old test data if it exists to avoid duplicates
    const filtered = existingSchedules.filter((s: any) => s.id !== scheduleId);

    await setDoc(userRef, {
      smartSchedules: [...filtered, testPayload],
      smartScheduleUpdatedAt: serverTimestamp(),
    }, { merge: true });

    alert("Test data injected! Refresh your graph.");
  } catch (error) {
    console.error("Injection failed", error);
  }
};