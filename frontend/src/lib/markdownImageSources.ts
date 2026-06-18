export function resolvedImageSourceCacheKey(activePath: string, source: string) {
  return `${activePath}\n${source}`
}

const inlineImagePattern =
  /!\[([^\]]*)\]\((\S+?)(\s+(?:"[^"]*"|'[^']*'|\([^)]*\)))?\)/g

export function restoreResolvedImageSources(
  markdown: string,
  previousMarkdown: string,
  activePath: string,
  resolvedSources: ReadonlyMap<string, string>,
) {
  const previousTargets = collectInlineImageTargets(previousMarkdown)
  let imageIndex = 0

  return markdown.replace(inlineImagePattern, (match, label, target, title = '') => {
    const previousTarget = previousTargets[imageIndex]
    imageIndex += 1

    if (!previousTarget) {
      return match
    }

    const resolvedSource = findResolvedSource(resolvedSources, activePath, previousTarget)
    if (
      !resolvedSource ||
      normalizeComparableImageSource(target) !== normalizeComparableImageSource(resolvedSource)
    ) {
      return match
    }

    return `![${label}](${previousTarget}${title})`
  })
}

function collectInlineImageTargets(markdown: string): string[] {
  return Array.from(markdown.matchAll(inlineImagePattern), (match) => match[2])
}

function findResolvedSource(
  resolvedSources: ReadonlyMap<string, string>,
  activePath: string,
  source: string,
) {
  const directMatch = resolvedSources.get(resolvedImageSourceCacheKey(activePath, source))
  if (directMatch) {
    return directMatch
  }

  const normalizedSource = normalizeComparableImageSource(source)
  for (const [cacheKey, resolvedSource] of resolvedSources) {
    const separatorIndex = cacheKey.indexOf('\n')
    if (separatorIndex === -1 || cacheKey.slice(0, separatorIndex) !== activePath) {
      continue
    }
    if (normalizeComparableImageSource(cacheKey.slice(separatorIndex + 1)) === normalizedSource) {
      return resolvedSource
    }
  }

  return ''
}

export function normalizeComparableImageSource(value: string) {
  const trimmed = value.trim()
  try {
    return decodeURI(trimmed)
  } catch {
    return trimmed
  }
}
