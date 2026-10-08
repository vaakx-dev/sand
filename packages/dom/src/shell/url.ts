const token = () => {
  try {
    return new URLSearchParams(location.search).get('token') ?? ''
  } catch {
    return ''
  }
}

export const serverUrl = (path: string, params: Record<string, string | number> = {}) => {
  const query = new URLSearchParams({ ...Object.fromEntries(Object.entries(params).map(([key, value]) => [key, String(value)])), token: token() })
  return `${path}?${query}`
}
