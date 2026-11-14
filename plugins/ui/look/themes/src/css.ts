const comments = /\/\*[\s\S]*?(?:\*\/|$)/g

const plainEscape = /\\([0-9a-fA-F]{1,6})\s?|\\([a-zA-Z0-9])/g

const unescapePlain = (css: string) =>
  css.replace(plainEscape, (whole, code: string | undefined, letter: string | undefined) => {
    if (letter) return letter
    const char = String.fromCodePoint(Number.parseInt(code!, 16))
    return /[a-zA-Z0-9:/(-]/.test(char) ? char : whole
  })

const imports = /@import\b[^;]*;?/gi

const urls = /\burl\(\s*(?:"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'|([^)]*?))\s*\)/gi

const strings = /"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'/g

const reaches = (target: string) => {
  const trimmed = target.trim()
  if (/^data:/i.test(trimmed)) return false
  return /^[a-z][a-z0-9+.-]*:/i.test(trimmed) || trimmed.startsWith('//') || trimmed.startsWith('\\\\')
}

export const safeCss = (css: string) =>
  unescapePlain(css.replace(comments, ''))
    .replace(imports, '')
    .replace(urls, (whole, double?: string, single?: string, bare?: string) => (reaches(double ?? single ?? bare ?? '') ? 'none' : whole))
    .replace(strings, (whole, double?: string, single?: string) => (reaches(double ?? single ?? '') ? '""' : whole))
