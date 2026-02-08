'use client'

import { createContext, useContext, useEffect, useState } from 'react'

type Theme = 'orange' | 'violet'

type ThemeProviderProps = {
  children: React.ReactNode
  defaultTheme?: Theme
  storageKey?: string
}

type ThemeProviderState = {
  theme: Theme
  toggleTheme: () => void
}

const initialState: ThemeProviderState = {
  theme: 'orange',
  toggleTheme: () => null,
}

const ThemeProviderContext = createContext<ThemeProviderState>(initialState)

export function ThemeProvider({
  children,
  defaultTheme = 'orange',
  storageKey = 'fireleagues-ui-theme',
  ...props
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(defaultTheme)
  
  useEffect(() => {
    const storedTheme = localStorage.getItem(storageKey) as Theme | null;
    if (storedTheme) {
        setTheme(storedTheme)
    }
  }, [storageKey])

  useEffect(() => {
    const root = window.document.documentElement
    root.classList.remove('theme-violet') // only violet for now, but scalable
    if (theme === 'violet') {
      root.classList.add('theme-violet')
    }
    // 'orange' theme is the default, no class needed
  }, [theme])

  const toggleTheme = () => {
      const newTheme = theme === 'orange' ? 'violet' : 'orange';
      localStorage.setItem(storageKey, newTheme);
      setTheme(newTheme);
  }

  const value = {
    theme,
    toggleTheme,
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
