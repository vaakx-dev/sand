import { kindOfUrl } from '@sand/devices-connect'
import { homePcMeta } from '@sand/devices-contract'
import { thisApp } from './app'

export const homePcId = () => {
  const id = document.querySelector<HTMLMetaElement>(`meta[name="${homePcMeta}"]`)?.content
  if (!id) throw new Error("This page doesn't say which PC served it. Reload it.")
  return id
}

export const pageRoutes = () => thisApp()?.routes ?? [location.origin]

export const pageUrl = (path: string) => `${pageRoutes()[0]}${path}`

export const securePage = () => !thisApp() && location.protocol === 'https:'

export const servedFromThisPc = () => !thisApp() && kindOfUrl(location.origin) === 'local'
