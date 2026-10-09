const key = 'settings'

export const requestedPage = () => new URLSearchParams(location.search).get(key) ?? undefined

export const showPage = (id: string | undefined) => {
  const url = new URL(location.href)
  if (id) url.searchParams.set(key, id)
  else url.searchParams.delete(key)
  if (url.href !== location.href) history.replaceState(history.state, '', url)
}
