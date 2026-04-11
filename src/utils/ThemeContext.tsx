import { createContext, useContext, useState, ReactNode, useMemo } from 'react'
import { themes, Theme, ThemeName } from './Themes'

type ThemeContextType = {
    theme: Theme
    setTheme: (name: ThemeName) => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export default function ThemeProvider({ children }: { children: ReactNode }) {
    const [themeName, setThemeName] = useState<ThemeName>('default')
    const theme = themes[themeName]

  return (
    <ThemeContext.Provider value={{ theme, setTheme: setThemeName}}>
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

