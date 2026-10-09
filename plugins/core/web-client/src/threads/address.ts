const key = 'session'

export const requestedSession = () => new URLSearchParams(location.search).get(key) ?? undefined

export const showSession = (id: string | undefined) => {
  const url = new URL(location.href)
  if (id) url.searchParams.set(key, id)
  else url.searchParams.delete(key)
  if (url.href !== location.href) history.replaceState(history.state, '', url)
}
