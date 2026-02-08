
'use client'

import { createContext, useContext, useEffect, useState } from 'react'

export type ColorTheme =
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

export const COLOR_THEME_NAMES: ColorTheme[] = [
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

export type ThemeMode = 'light' | 'dark'

type ThemeProviderProps = {
  children: React.ReactNode
  defaultTheme?: ColorTheme
  defaultMode?: ThemeMode
  storageKey?: string
  modeStorageKey?: string
}

type ThemeProviderState = {
  theme: ColorTheme
  setTheme: (theme: ColorTheme) => void
  mode: ThemeMode
  setMode: (mode: ThemeMode) => void
}

const initialState: ThemeProviderState = {
  theme: 'orange',
  setTheme: () => null,
  mode: 'dark',
  setMode: () => null,
}

const ThemeProviderContext = createContext<ThemeProviderState>(initialState)

export function ThemeProvider({
  children,
  defaultTheme = 'orange',
  defaultMode = 'dark',
  storageKey = 'fireleagues-ui-theme',
  modeStorageKey = 'fireleagues-ui-mode',
  ...props
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<ColorTheme>(() => {
    if (typeof window !== 'undefined') {
        const storedTheme = localStorage.getItem(storageKey) as ColorTheme | null;
        if (storedTheme && COLOR_THEME_NAMES.includes(storedTheme)) {
            return storedTheme;
        }
    }
    return defaultTheme;
  });

  const [mode, setModeState] = useState<ThemeMode>(() => {
    if (typeof window !== 'undefined') {
        const storedMode = localStorage.getItem(modeStorageKey) as ThemeMode | null;
        if (storedMode && ['light', 'dark'].includes(storedMode)) {
            return storedMode;
        }
    }
    return defaultMode;
  });
  
  useEffect(() => {
    const root = window.document.documentElement
    
    root.classList.remove('dark');
    if (mode === 'dark') {
      root.classList.add('dark');
    }

    // Remove all theme classes
    COLOR_THEME_NAMES.forEach(themeName => {
        root.classList.remove(`theme-${themeName}`);
    });

    // Add the current theme class
    root.classList.add(`theme-${theme}`)
  }, [theme, mode])

  const setTheme = (newTheme: ColorTheme) => {
      localStorage.setItem(storageKey, newTheme);
      setThemeState(newTheme);
  }

  const setMode = (newMode: ThemeMode) => {
    localStorage.setItem(modeStorageKey, newMode);
    setModeState(newMode);
  }

  const value = {
    theme,
    setTheme,
    mode,
    setMode,
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
