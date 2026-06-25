import type { GlobalThemeOverrides } from 'naive-ui'
import type { ThemeMode } from './theme'

export function createNaiveThemeOverrides(mode: ThemeMode): GlobalThemeOverrides {
  const isDark = mode === 'dark'
  return {
    common: {
      borderRadius: '8px',
      borderRadiusSmall: '6px',
      fontFamily:
        'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      primaryColor: isDark ? '#c5ccd1' : '#0f766e',
      primaryColorHover: isDark ? '#d5dadd' : '#0d9488',
      primaryColorPressed: isDark ? '#aab4bc' : '#0f766e',
      primaryColorSuppl: isDark ? '#8f9ba3' : '#14b8a6',
      textColorBase: isDark ? '#e8e8e8' : '#1f2937',
      textColor1: isDark ? '#e8e8e8' : '#1f2937',
      textColor2: isDark ? '#c5ccd1' : '#5f6b7a',
      textColor3: isDark ? '#a6a6a6' : '#8a96a6',
      bodyColor: isDark ? '#050505' : '#f4f6f8',
      cardColor: isDark ? '#0c0c0c' : '#ffffff',
      modalColor: isDark ? '#151515' : '#ffffff',
      popoverColor: isDark ? '#151515' : '#ffffff',
      borderColor: isDark ? '#252525' : '#dfe5ec',
      dividerColor: isDark ? '#252525' : '#dfe5ec',
    },
    Button: {
      heightSmall: '32px',
      heightMedium: '36px',
      paddingSmall: '0 10px',
      paddingMedium: '0 12px',
      borderRadiusSmall: '7px',
      borderRadiusMedium: '8px',
    },
    Input: {
      heightSmall: '32px',
      heightMedium: '36px',
      borderRadius: '8px',
    },
    Drawer: {
      color: isDark ? '#0c0c0c' : '#ffffff',
    },
  }
}
