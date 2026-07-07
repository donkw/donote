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
      primaryColor: isDark ? '#f4b860' : '#b45309',
      primaryColorHover: isDark ? '#ffd08a' : '#9a3412',
      primaryColorPressed: isDark ? '#d99642' : '#7c2d12',
      primaryColorSuppl: isDark ? '#ffe4ba' : '#7c2d12',
      textColorBase: isDark ? '#f4f6f8' : '#111827',
      textColor1: isDark ? '#f4f6f8' : '#111827',
      textColor2: isDark ? '#c6ced8' : '#4b5563',
      textColor3: isDark ? '#9ca7b5' : '#5f6b7a',
      bodyColor: isDark ? '#101318' : '#f3f5f7',
      cardColor: isDark ? '#181c23' : '#ffffff',
      modalColor: isDark ? '#222832' : '#ffffff',
      popoverColor: isDark ? '#222832' : '#ffffff',
      borderColor: isDark ? '#303743' : '#d7dde5',
      dividerColor: isDark ? '#303743' : '#d7dde5',
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
      color: isDark ? '#181c23' : '#ffffff',
    },
  }
}
