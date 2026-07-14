import { useTheme } from '../../context/ThemeContext';
import './ThemeSwitcher.css';

export default function ThemeSwitcher() {
  const { mode, toggleMode } = useTheme();
  const isDark = mode === 'dark';

  return (
    <button
      className="theme-trigger"
      onClick={toggleMode}
      id="theme-switcher-btn"
      aria-label="Toggle theme"
      title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
    >
      {isDark ? '🌙' : '☀️'}
    </button>
  );
}
