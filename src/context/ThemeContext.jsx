import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  // LensLeague uses one intentional, accessible dark appearance throughout.
  const [mode, setMode] = useState('dark');

  // Apply mode to <html> data theme attribute and update theme-color meta tag
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', mode);
    localStorage.setItem('ll-mode', mode); // Overwrite any old 'light' values

    let metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (!metaThemeColor) {
      metaThemeColor = document.createElement('meta');
      metaThemeColor.name = 'theme-color';
      document.head.appendChild(metaThemeColor);
    }
    metaThemeColor.setAttribute('content', mode === 'dark' ? '#06141B' : '#F5F7FA');
  }, [mode]);

  // Keep the API for existing controls without allowing legacy light screens.
  const toggleMode = () => setMode('dark');

  return (
    <ThemeContext.Provider value={{ mode, toggleMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
