export interface Link {
  url: string
  token: string
}

export const parseLink = (text: string): Link => {
  let parsed: URL
  try {
    parsed = new URL(text.trim())
  } catch {
    throw new Error('Paste the full link the other sand shows, like http://100.64.0.2:4317/?token=…')
  }
  const token = parsed.searchParams.get('token')
  if (!/^https?:$/.test(parsed.protocol) || !token) throw new Error('That link has no token. Copy it from Devices on the other PC.')
  return { url: parsed.origin, token }
}
