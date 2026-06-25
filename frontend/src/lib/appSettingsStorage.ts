export interface AppSettingsSnapshot {
  values?: Record<string, unknown>
}

export interface AppSettingsStorage extends Storage {
  replace(snapshot: AppSettingsSnapshot | null | undefined): void
  snapshot(): { values: Record<string, string> }
}

export function createAppSettingsStorage(
  initialSnapshot?: AppSettingsSnapshot | null,
  onChange: () => void = () => {},
): AppSettingsStorage {
  let values = normalizeSettingsValues(initialSnapshot)

  return {
    get length() {
      return Object.keys(values).length
    },
    clear() {
      values = {}
      onChange()
    },
    getItem(key: string) {
      return Object.prototype.hasOwnProperty.call(values, key) ? values[key] : null
    },
    key(index: number) {
      return Object.keys(values)[index] ?? null
    },
    removeItem(key: string) {
      delete values[key]
      onChange()
    },
    setItem(key: string, value: string) {
      values[key] = String(value)
      onChange()
    },
    replace(snapshot: AppSettingsSnapshot | null | undefined) {
      values = normalizeSettingsValues(snapshot)
    },
    snapshot() {
      return { values: { ...values } }
    },
  }
}

function normalizeSettingsValues(
  snapshot: AppSettingsSnapshot | null | undefined,
): Record<string, string> {
  if (!snapshot || typeof snapshot.values !== 'object' || snapshot.values === null) {
    return {}
  }

  return Object.fromEntries(
    Object.entries(snapshot.values).filter(
      (entry): entry is [string, string] => entry[0] !== '' && typeof entry[1] === 'string',
    ),
  )
}
