const hostOf = (given: string) => URL.parse(given.includes('://') ? given : `https://${given}`)?.hostname.toLowerCase() || undefined

const onWeb = (url: string) => !url.includes('://') || /^https?:\/\//i.test(url)

export const siteOf = (given: string) => {
  const host = hostOf(given)
  if (!host) throw new Error(`"${given}" isn't a website domain like bank.com`)
  return host
}

export const sitesOf = (urls: string[]) => [...new Set(urls.filter(onWeb).flatMap(url => hostOf(url) ?? []))]
