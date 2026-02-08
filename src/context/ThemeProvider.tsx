'use client'

import { createContext, useContext, useEffect, useState } from 'react'

export type Theme =
  | 'orange'
  | 'violet'
  | 'green'
  | 'pink'
  | 'blue'
  | 'yellow'
  | 'red'
  | 'teal'
  | 'lime'
  | 'cyan'
  | 'indigo'
  | 'grape'
  | 'spring-green'

export const THEME_NAMES: Theme[] = [
  'orange',
  'violet',
  'green',
  'pink',
  'blue',
  'yellow',
  'red',
  'teal',
  'lime',
  'cyan',
  'indigo',
  'grape',
  'spring-green',
]

type ThemeProviderProps = {
  children: React.ReactNode
  defaultTheme?: Theme
  storageKey?: string
}

type ThemeProviderState = {
  theme: Theme
  setTheme: (theme: Theme) => void
}

const initialState: ThemeProviderState = {
  theme: 'orange',
  setTheme: () => null,
}

const ThemeProviderContext = createContext<ThemeProviderState>(initialState)

export function ThemeProvider({
  children,
  defaultTheme = 'orange',
  storageKey = 'fireleagues-ui-theme',
  ...props
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
        const storedTheme = localStorage.getItem(storageKey) as Theme | null;
        if (storedTheme && THEME_NAMES.includes(storedTheme)) {
            return storedTheme;
        }
    }
    return defaultTheme;
  });
  
  useEffect(() => {
    const root = window.document.documentElement
    
    // Remove all theme classes
    THEME_NAMES.forEach(themeName => {
        if (themeName !== 'orange') { // 'orange' is the default and doesn't have a class
            root.classList.remove(`theme-${themeName}`);
        }
    });

    // Add the current theme class if it's not the default
    if (theme !== 'orange') {
      root.classList.add(`theme-${theme}`)
    }
  }, [theme])

  const setTheme = (newTheme: Theme) => {
      localStorage.setItem(storageKey, newTheme);
      setThemeState(newTheme);
  }

  const value = {
    theme,
    setTheme,
  }

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext)

  if (context === undefined)
    throw new Error('useTheme must be used within a ThemeProvider')

  return context
}
