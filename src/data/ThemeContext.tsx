import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import * as settingsApi from './settingsApi';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: 'light' | 'dark';
}

const ThemeContext = createContext<ThemeContextType | null>(null);

const safeThemeDefaults: ThemeContextType = {
  theme: 'dark',
  setTheme: () => {},
  resolvedTheme: 'dark',
};

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) return safeThemeDefaults;
  return ctx;
}

function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function resolveTheme(theme: Theme): 'light' | 'dark' {
  if (theme === 'system') return getSystemTheme();
  return theme;
}

function applyTheme(resolved: 'light' | 'dark') {
  const root = document.documentElement;
  if (resolved === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    try {
      return (localStorage.getItem('aurelo-theme') as Theme) || 'dark';
    } catch {
      return 'dark';
    }
  });

  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>(() => resolveTheme(theme));

  useEffect(() => {
    const resolved = resolveTheme(theme);
    setResolvedTheme(resolved);
    applyTheme(resolved);
  }, [theme]);

  useEffect(() => {
    if (theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      const resolved = resolveTheme('system');
      setResolvedTheme(resolved);
      applyTheme(resolved);
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme]);

  useEffect(() => {
    settingsApi.loadSetting('profile')
      .then((profile: any) => {
        if (profile?.theme && profile.theme !== theme) {
          setThemeState(profile.theme);
          try { localStorage.setItem('aurelo-theme', profile.theme); } catch {}
        }
      })
      .catch(() => {});
  }, []);

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
    try { localStorage.setItem('aurelo-theme', newTheme); } catch {}
    settingsApi.loadSetting('profile')
      .then((profile: any) => {
        settingsApi.saveSetting('profile', { ...profile, theme: newTheme });
      })
      .catch(() => {});
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
