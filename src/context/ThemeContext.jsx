import { createContext, useContext, useState, useEffect } from 'react';

// ── Font options ──────────────────────────────────────────────
export const FONT_OPTIONS = [
  {
    id: 'default',
    label: 'Inter + Syne',
    description: 'Current — clean & modern',
    ui: 'Inter, system-ui, sans-serif',
    display: 'Syne, Inter, sans-serif',
  },
  {
    id: 'jakarta',
    label: 'Plus Jakarta Sans',
    description: 'Premium & geometric',
    ui: '"Plus Jakarta Sans", sans-serif',
    display: '"Plus Jakarta Sans", sans-serif',
  },
  {
    id: 'dm',
    label: 'DM Sans + Syne',
    description: 'Soft & approachable',
    ui: '"DM Sans", sans-serif',
    display: 'Syne, "DM Sans", sans-serif',
  },
  {
    id: 'grotesk',
    label: 'Space Grotesk',
    description: 'Technical & editorial',
    ui: '"Space Grotesk", sans-serif',
    display: '"Space Grotesk", sans-serif',
  },
  {
    id: 'playfair',
    label: 'Playfair + Jakarta',
    description: 'Luxury & editorial',
    ui: '"Plus Jakarta Sans", sans-serif',
    display: '"Playfair Display", serif',
  },
];

// ── Theme Context ─────────────────────────────────────────────
const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  // Dark/light mode
  const [mode, setMode] = useState(() => localStorage.getItem('ll-mode') || 'dark');
  // Font
  const [fontId, setFontId] = useState(() => localStorage.getItem('ll-font') || 'default');

  const font = FONT_OPTIONS.find(f => f.id === fontId) || FONT_OPTIONS[0];

  // Apply mode to <html> data attribute
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', mode);
    localStorage.setItem('ll-mode', mode);
  }, [mode]);

  // Apply fonts to CSS variables
  useEffect(() => {
    document.documentElement.style.setProperty('--font-ui', font.ui);
    document.documentElement.style.setProperty('--font-display', font.display);
    localStorage.setItem('ll-font', fontId);
  }, [fontId, font]);

  const toggleMode = () => setMode(m => m === 'dark' ? 'light' : 'dark');

  return (
    <ThemeContext.Provider value={{ mode, toggleMode, fontId, setFontId, font }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
