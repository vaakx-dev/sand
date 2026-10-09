import { bearer, hostPaths } from '@sand/kit'

type BundleAuth = { key: string } | { secret: string }

const bundleUrl = (base: string, auth: BundleAuth) => {
  const url = `${base.replace(/\/+$/, '')}${hostPaths.bundle}`
  return 'secret' in auth ? `${url}?k=${encodeURIComponent(auth.secret)}` : url
}

export const downloadBundle = async (base: string, auth: BundleAuth, wait = 120_000): Promise<{ bytes: Uint8Array; id: string }> => {
  const headers = 'key' in auth ? bearer(auth.key) : undefined
  const response = await fetch(bundleUrl(base, auth), { headers, signal: AbortSignal.timeout(wait) })
  if (response.status === 401 || response.status === 403) throw new Error(`${base} did not accept this PC`)
  if (!response.ok) throw new Error((await response.text().catch(() => '')) || `HTTP ${response.status}`)
  return { bytes: await response.bytes(), id: response.headers.get('x-sand-build') ?? '' }
}
