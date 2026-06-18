export interface AttachmentDirectories {
  images: string
  files: string
}

export const attachmentDirectoriesStorageKey = 'donote.attachmentDirectories'

export const defaultAttachmentDirectories: AttachmentDirectories = {
  images: '',
  files: '',
}

export function getInitialAttachmentDirectories(
  storage: Storage | undefined = window.localStorage,
): AttachmentDirectories {
  const stored = storage?.getItem(attachmentDirectoriesStorageKey)
  if (!stored) {
    return { ...defaultAttachmentDirectories }
  }

  try {
    return normalizeAttachmentDirectories(JSON.parse(stored))
  } catch {
    return { ...defaultAttachmentDirectories }
  }
}

export function saveAttachmentDirectories(
  value: unknown,
  storage: Storage | undefined = window.localStorage,
): AttachmentDirectories {
  const normalized = normalizeAttachmentDirectories(value)
  storage?.setItem(attachmentDirectoriesStorageKey, JSON.stringify(normalized))
  return normalized
}

export function normalizeAttachmentDirectories(value: unknown): AttachmentDirectories {
  if (!isRecord(value)) {
    return { ...defaultAttachmentDirectories }
  }

  return {
    images: normalizeAttachmentDirectory(value.images),
    files: normalizeAttachmentDirectory(value.files),
  }
}

function normalizeAttachmentDirectory(value: unknown): string {
  if (typeof value !== 'string') {
    return ''
  }

  const normalized = value.trim().replaceAll('\\', '/').replace(/^\/+|\/+$/g, '')
  if (!normalized || /^[a-z]:/i.test(normalized) || normalized.startsWith('/')) {
    return ''
  }
  if (normalized.split('/').some((segment) => segment === '' || segment === '..')) {
    return ''
  }
  return normalized
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
