import { createContext, useContext, useState, ReactNode, useMemo, useEffect } from 'react'
import { themes, Theme, ThemeName } from './Themes'
import { auth, db } from 'firebaseConfig'
import { onSnapshot, doc } from 'firebase/firestore'
import { onAuthStateChanged } from 'firebase/auth' 

type ThemeContextType = {
    theme: Theme
    themeName: ThemeName
    setTheme: (name: ThemeName) => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export default function ThemeProvider({ children }: { children: ReactNode }) {
    const [themeName, setThemeName] = useState<ThemeName>('default')
    const theme = themes[themeName]

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
            if (!user) return

            const userRef = doc(db, 'users', user.uid)

            const unsubscribeSnap = onSnapshot(userRef, (snap) => {
            if (snap.exists()) {
                const data = snap.data()
                if (data.currentThemeId) {
                setThemeName(data.currentThemeId)
                }
            }
            })

            return () => unsubscribeSnap()
        })

        return () => unsubscribeAuth()
    }, [])

  return (
    <ThemeContext.Provider value={{ theme, setTheme: setThemeName, themeName}}>
        {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => {
    const context = useContext(ThemeContext)
    if (!context) throw new Error('useTheme must be used inside ThemeProvider')
    return context
}

export function useThemeStyle<T>(stylesFactory: (theme: Theme) => T) {
    const { theme } = useTheme()

    return useMemo(() => stylesFactory(theme), [theme, stylesFactory])
}