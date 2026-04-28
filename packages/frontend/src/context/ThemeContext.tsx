import React, { createContext, useContext, useEffect, useState } from 'react'


const ThemeContext = createContext({
  isDark: false,
  toggle: () => {},
})

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useColorMode()
  return (
    <ThemeContext.Provider value={theme}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}

function useColorMode() {
  const [isDark, setIsDark] = useState(() => {
  const stored = localStorage.getItem('hydra_theme') === 'dark'
  document.documentElement.setAttribute('data-theme', stored ? 'dark' : 'light')
  return stored
})


  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light')
    localStorage.setItem('hydra_theme', isDark ? 'dark' : 'light')
  }, [isDark])

  return { isDark, toggle: () => setIsDark(v => !v) }
}