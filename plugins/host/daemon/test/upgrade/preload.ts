const fake = process.env.SAND_TEST_GITHUB

const moves: [string, string][] = fake
  ? [
      ['https://api.github.com/', `${fake}/api/`],
      ['https://github.com/', `${fake}/gh/`],
      ['https://objects.githubusercontent.com/', `${fake}/objects/`],
    ]
  : []

const moved = (url: string) => {
  for (const [from, to] of moves) if (url.startsWith(from)) return to + url.slice(from.length)
}

const urlOf = (input: string | URL | Request) => (input instanceof Request ? input.url : String(input))

if (moves.length) {
  const real = globalThis.fetch
  const redirected = (input: string | URL | Request, init?: RequestInit) => {
    const target = moved(urlOf(input))
    if (!target) return real(input, init)
    return real(input instanceof Request ? new Request(target, input) : target, init)
  }
  globalThis.fetch = Object.assign(redirected, real)
}
