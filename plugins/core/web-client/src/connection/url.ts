const parse = (url: string) => {
  try {
    return new URL(url)
  } catch {
    return undefined
  }
}

export const originOf = (url: string) => {
  const parsed = parse(url)
  return parsed?.protocol === 'http:' || parsed?.protocol === 'https:' ? parsed.origin : undefined
}

export const hostOf = (url: string) => parse(url)?.host ?? url
