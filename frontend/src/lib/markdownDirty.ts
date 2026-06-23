import type { OpenDocument } from '../types/app'

export function isDocumentDirty(document: Pick<OpenDocument, 'content' | 'savedContent'>): boolean {
  return normalizeMarkdownForDirtyCheck(document.content) !== normalizeMarkdownForDirtyCheck(document.savedContent)
}

export function normalizeMarkdownForDirtyCheck(content: string): string {
  const trimmed = content
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+$/gm, '')
    .replace(/\s+$/g, '')
  return normalizeUnorderedListMarkers(trimmed)
}

function normalizeUnorderedListMarkers(content: string): string {
  let fence: { marker: string; length: number } | null = null

  return content
    .split('\n')
    .map((line) => {
      const fenceMatch = line.match(/^[ \t]{0,3}(`{3,}|~{3,})/)
      if (fenceMatch) {
        const marker = fenceMatch[1][0]
        const length = fenceMatch[1].length
        if (!fence) {
          fence = { marker, length }
        } else if (marker === fence.marker && length >= fence.length) {
          fence = null
        }
        return line
      }

      if (fence) {
        return line
      }

      return line.replace(/^([ \t]{0,3})[*+](?=[ \t]+)/, '$1-')
    })
    .join('\n')
}
