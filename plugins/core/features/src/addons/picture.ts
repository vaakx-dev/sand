const PICTURE_TIMEOUT_MS = 20_000
const PICTURE_LIMIT_BYTES = 4 * 1024 * 1024

const TYPES: Record<string, string> = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', gif: 'image/gif' }

const typeOf = (file: string) => TYPES[file.split('.').pop()?.toLowerCase() ?? '']

const fetchPicture = async (url: string, file: string) => {
  const type = typeOf(file)
  if (!type) throw new Error(`${file} isn't a picture sand shows`)
  const response = await fetch(url, { headers: { 'user-agent': 'sand' }, signal: AbortSignal.timeout(PICTURE_TIMEOUT_MS) })
  if (!response.ok) throw new Error(`Couldn't load ${file}: HTTP ${response.status}`)
  const bytes = await response.bytes()
  if (bytes.length > PICTURE_LIMIT_BYTES) throw new Error(`${file} is too big to show`)
  return `data:${type};base64,${bytes.toBase64()}`
}

const pictureCache = () => {
  const kept = new Map<string, Promise<string>>()
  return (url: string, file: string) => {
    const known = kept.get(url)
    if (known) return known
    const loading = fetchPicture(url, file)
    kept.set(url, loading)
    loading.catch(() => kept.delete(url))
    return loading
  }
}

export { pictureCache }
