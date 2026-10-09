export interface Args {
  words: string[]
  asDefault: boolean
  quiet: boolean
}

export const parseArgs = (text: string): Args => {
  const tokens = text.trim().toLowerCase().split(/\s+/).filter(Boolean)
  return {
    words: tokens.filter(token => !token.startsWith('--')),
    asDefault: tokens.includes('--default'),
    quiet: tokens.includes('--quiet'),
  }
}
