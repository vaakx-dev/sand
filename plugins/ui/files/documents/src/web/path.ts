const EXTERNAL = /^(?:[a-z][a-z\d+.-]*:|\/|\\)/i

const decoded = (href: string) => {
  try {
    return decodeURIComponent(href)
  } catch {
    return undefined
  }
}

const insidePath = (from: string, href: string) => {
  const target = decoded(href.split(/[?#]/, 1)[0] ?? '')
  if (target === undefined || EXTERNAL.test(href)) return undefined
  const folders = from.split('/').slice(0, -1)
  const parts = target.split('/').reduce<string[] | undefined>((path, part) => {
    if (!path || part === '' || part === '.') return path
    if (part === '..') return path.length ? path.slice(0, -1) : undefined
    return [...path, part]
  }, folders)
  return parts?.join('/')
}

export { insidePath }
