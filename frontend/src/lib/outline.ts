export interface OutlineItem {
  id: string
  level: number
  text: string
  line: number
}

export function extractOutline(markdown: string): OutlineItem[] {
  const lines = markdown.split(/\r?\n/)
  const outline: OutlineItem[] = []
  let inFence = false

  lines.forEach((line, index) => {
    if (/^\s*```/.test(line) || /^\s*~~~/.test(line)) {
      inFence = !inFence
      return
    }
    if (inFence) {
      return
    }

    const match = /^(#{1,6})\s+(.+?)\s*$/.exec(line)
    if (!match) {
      return
    }

    const text = match[2].replace(/\s+#+$/, '').trim()
    if (!text) {
      return
    }
    const lineNumber = index + 1
    outline.push({
      id: `${slugify(text)}-${lineNumber}`,
      level: match[1].length,
      text,
      line: lineNumber,
    })
  })

  return outline
}

function slugify(value: string): string {
  const slug = value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .trim()
    .replace(/\s+/g, '-')
  return slug || 'heading'
}
