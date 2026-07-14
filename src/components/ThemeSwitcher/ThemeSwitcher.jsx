import { useState } from 'react';
import { useTheme, FONT_OPTIONS } from '../../context/ThemeContext';
import './ThemeSwitcher.css';

export default function ThemeSwitcher() {
  const { mode, toggleMode, fontId, setFontId } = useTheme();
  const [open, setOpen] = useState(false);
  const isDark = mode === 'dark';

  return (
    <>
      {/* Floating trigger button */}
      <button
        className="theme-trigger"
        onClick={() => setOpen(o => !o)}
        id="theme-switcher-btn"
        aria-label="Theme settings"
        title="Theme & Font settings"
      >
        {isDark ? '🌙' : '☀️'}
      </button>

      {/* Panel */}
      {open && (
        <>
          <div className="theme-backdrop" onClick={() => setOpen(false)} />
          <div className="theme-panel animate-scale-in">

            <div className="theme-panel__header">
              <span className="theme-panel__title">Appearance</span>
              <button className="theme-panel__close" onClick={() => setOpen(false)} id="close-theme-panel">✕</button>
            </div>

            {/* Dark / Light toggle */}
            <div className="theme-section">
              <div className="theme-section__label">Colour Mode</div>
              <div className="theme-mode-row">
                <button
                  className={`theme-mode-btn ${isDark ? 'theme-mode-btn--active' : ''}`}
                  onClick={() => !isDark && toggleMode()}
                  id="dark-mode-btn"
                >
                  <span className="theme-mode-btn__icon">🌙</span>
                  <span>Dark</span>
                </button>
                <button
                  className={`theme-mode-btn ${!isDark ? 'theme-mode-btn--active' : ''}`}
                  onClick={() => isDark && toggleMode()}
                  id="light-mode-btn"
                >
                  <span className="theme-mode-btn__icon">☀️</span>
                  <span>Light</span>
                </button>
              </div>
            </div>

            {/* Font picker */}
            <div className="theme-section">
              <div className="theme-section__label">Font Style</div>
              <div className="font-options">
                {FONT_OPTIONS.map(f => (
                  <button
                    key={f.id}
                    className={`font-option ${fontId === f.id ? 'font-option--active' : ''}`}
                    onClick={() => setFontId(f.id)}
                    id={`font-${f.id}`}
                    style={{ fontFamily: f.ui }}
                  >
                    <div className="font-option__name">{f.label}</div>
                    <div className="font-option__preview" style={{ fontFamily: f.display }}>
                      Aa — LensLeague
                    </div>
                    <div className="font-option__desc">{f.description}</div>
                    {fontId === f.id && <div className="font-option__check">✓</div>}
                  </button>
                ))}
              </div>
            </div>

          </div>
        </>
      )}
    </>
  );
}
