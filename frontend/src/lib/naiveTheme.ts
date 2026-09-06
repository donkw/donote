import type { GlobalThemeOverrides } from 'naive-ui'
import type { ThemeMode } from './theme'

export function createNaiveThemeOverrides(mode: ThemeMode): GlobalThemeOverrides {
  const isDark = mode === 'dark'
  return {
    common: {
      borderRadius: '8px',
      borderRadiusSmall: '6px',
      fontFamily:
        '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
      primaryColor: isDark ? '#64aaff' : '#0066cc',
      primaryColorHover: isDark ? '#85bdff' : '#005bb5',
      primaryColorPressed: isDark ? '#4094fa' : '#004f9e',
      primaryColorSuppl: isDark ? '#bfdbff' : '#004f9e',
      textColorBase: isDark ? '#f5f5f7' : '#1d1d1f',
      textColor1: isDark ? '#f5f5f7' : '#1d1d1f',
      textColor2: isDark ? '#ceced2' : '#515154',
      textColor3: isDark ? '#a1a1a6' : '#68686d',
      bodyColor: isDark ? '#1c1c1e' : '#f5f5f7',
      cardColor: isDark ? '#242426' : '#ffffff',
      modalColor: isDark ? '#2c2c2e' : '#ffffff',
      popoverColor: isDark ? '#2c2c2e' : '#ffffff',
      borderColor: isDark ? '#414145' : '#dcdce0',
      dividerColor: isDark ? '#414145' : '#dcdce0',
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
      color: isDark ? '#242426' : '#ffffff',
    },
  }
}
