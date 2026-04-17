import { createContext, useContext, useEffect, useState } from "react"
import { db, auth } from "firebaseConfig"
import { doc, getDoc } from "firebase/firestore"
import { useAuth } from "./AuthContext"

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

type SessionContextType = {
  sessions: SmartScheduleSessions[]
  loading: boolean
}

const SessionContext = createContext<SessionContextType>({ sessions: [], loading: true })

export function FetchSessions({ children }: any) {
    const [sessions, setSessions] = useState<SmartScheduleSessions[]>([])
    const [loading, setLoading] = useState(true)
    const { user } = useAuth()

    useEffect(() => {
        const loadData = async () => {
        if (!user) return
        setLoading(true)
        try {
            const sessions = await getSchedule(user.uid)
            setSessions(sessions)
        } catch (error) {
            console.error("Failed to load schedule", error)
        } finally {
            setLoading(false)
        }
        }
        loadData()
    }, [user])

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

    return (
        <SessionContext.Provider value={{ sessions, loading }}>
            {children}
        </SessionContext.Provider>
    )
}

export const useSessions = () => useContext(SessionContext)