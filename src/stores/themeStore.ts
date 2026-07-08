import { create } from 'zustand';

function isNight(): boolean {
  const h = new Date().getHours();
  return h >= 19 || h < 7;
}

function getInitialDark(): boolean {
  if (typeof window === 'undefined') return false;
  const saved = localStorage.getItem('adminTheme');
  if (saved === 'dark') return true;
  if (saved === 'light') return false;
  return isNight();
}

interface ThemeState {
  isDark: boolean;
  toggle: () => void;
  setDark: (dark: boolean) => void;
  init: () => void;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  isDark: false,
  toggle: () => {
    const next = !get().isDark;
    set({ isDark: next });
    if (typeof window !== 'undefined') {
      document.documentElement.dataset.theme = next ? 'dark' : '';
      localStorage.setItem('adminTheme', next ? 'dark' : 'light');
    }
  },
  setDark: (dark: boolean) => {
    set({ isDark: dark });
    if (typeof window !== 'undefined') {
      document.documentElement.dataset.theme = dark ? 'dark' : '';
    }
  },
  init: () => {
    const dark = getInitialDark();
    set({ isDark: dark });
    if (typeof window !== 'undefined') {
      document.documentElement.dataset.theme = dark ? 'dark' : '';
    }
  },
}));
