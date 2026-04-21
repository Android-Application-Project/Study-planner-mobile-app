import { createContext, useContext, useEffect, useState } from "react"
import { db, auth } from "firebaseConfig"
import { doc, onSnapshot } from "firebase/firestore"
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
        if (!user) {
            setSessions([])
            setLoading(false)
            return
        }

        setLoading(true)

        const docRef = doc(db, 'users', user.uid)

        const unsubscribe = onSnapshot(docRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data()
                const schedules = data.smartSchedules || []

                const allSessions = schedules.flatMap(
                    (schedule: SessionContextType) => schedule.sessions || []
                )

                setSessions(allSessions)
            } else {
                setSessions([])
            }

            setLoading(false)
        }, (error) => {
            console.error('Error listening to schedule: ', error)
            setLoading(false)
        })

        return () => unsubscribe()

    }, [user])

    return (
        <SessionContext.Provider value={{ sessions, loading }}>
            {children}
        </SessionContext.Provider>
    )
}

export const useSessions = () => useContext(SessionContext)