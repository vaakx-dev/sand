const chunk = 0x8000

export const encodeBase64 = (bytes: Uint8Array) => {
  let binary = ''
  for (let start = 0; start < bytes.length; start += chunk) binary += String.fromCharCode(...bytes.subarray(start, start + chunk))
  return btoa(binary)
}

export const decodeBase64 = (text: string) => Uint8Array.from(atob(text), char => char.charCodeAt(0))
