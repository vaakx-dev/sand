const base64Url = (bytes: Uint8Array) => Buffer.from(bytes).toString('base64url')

export const pkce = async () => {
  const verifier = base64Url(crypto.getRandomValues(new Uint8Array(64)))
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))
  return { verifier, challenge: base64Url(new Uint8Array(digest)) }
}
