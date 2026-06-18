export const sidebarWidthStorageKey = 'donote.sidebarWidth'

export const defaultSidebarWidth = 286

export const sidebarWidthLimits = {
  min: 220,
  max: 480,
}

export function getInitialSidebarWidth(storage: Storage | undefined = window.localStorage): number {
  const stored = storage?.getItem(sidebarWidthStorageKey)
  if (!stored) {
    return defaultSidebarWidth
  }

  return normalizeSidebarWidth(Number(stored))
}

export function saveSidebarWidth(
  value: unknown,
  storage: Storage | undefined = window.localStorage,
): number {
  const normalized = normalizeSidebarWidth(value)
  storage?.setItem(sidebarWidthStorageKey, String(normalized))
  return normalized
}

export function normalizeSidebarWidth(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return defaultSidebarWidth
  }

  return clamp(Math.round(value), sidebarWidthLimits.min, sidebarWidthLimits.max)
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}
