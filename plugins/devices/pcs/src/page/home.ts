import { homePcMeta } from '@sand/devices-contract'

export const homePcId = () => {
  const id = document.querySelector<HTMLMetaElement>(`meta[name="${homePcMeta}"]`)?.content
  if (!id) throw new Error("This page doesn't say which PC served it. Reload it.")
  return id
}

export const pageUrl = (path: string) => `${location.origin}${path}`

export const securePage = () => location.protocol === 'https:'
