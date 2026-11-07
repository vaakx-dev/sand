export interface Print {
  length: number
  head: number
  roll: number
  mac: string
  mark: string
}

interface Match {
  start: number
  end: number
  mark: string
}

export const shortest = 4

const headMask = 0xffff

const randomOdd = () => (crypto.getRandomValues(new Uint32Array(1))[0]! | 1) >>> 0

const rollOf = (text: string, base: number, start: number, length: number) => {
  let roll = 0
  for (let at = start; at < start + length; at++) roll = (Math.imul(roll, base) + text.charCodeAt(at)) >>> 0
  return roll
}

const indexOf = (prints: Print[]) => {
  const filter = new Uint32Array((headMask + 1) >>> 5)
  const byHead = new Map<number, Print[]>()
  for (const print of prints) {
    filter[print.head >>> 5]! |= 1 << (print.head & 31)
    byHead.set(print.head, [...(byHead.get(print.head) ?? []), print])
  }
  return { filter, byHead }
}

const merged = (matches: Match[]) => {
  const out: (Match & { size: number })[] = []
  for (const match of matches) {
    const last = out.at(-1)
    const size = match.end - match.start
    if (!last || match.start >= last.end) {
      out.push({ ...match, size })
      continue
    }
    last.end = Math.max(last.end, match.end)
    if (size > last.size) Object.assign(last, { mark: match.mark, size })
  }
  return out
}

const spliced = (text: string, matches: Match[]) => {
  let out = ''
  let from = 0
  for (const { start, end, mark } of merged(matches)) {
    out += text.slice(from, start) + mark
    from = end
  }
  return out + text.slice(from)
}

export const createRedactor = () => {
  const key = crypto.getRandomValues(new Uint8Array(32))
  const base = randomOdd()
  const drop = Math.imul(Math.imul(base, base), base) >>> 0
  const macOf = (value: string) => new Bun.CryptoHasher('sha256', key).update(value).digest('base64')

  const print = (value: string, mark: string): Print => ({
    length: value.length,
    head: rollOf(value, base, 0, shortest) & headMask,
    roll: rollOf(value, base, 0, value.length),
    mac: macOf(value),
    mark,
  })

  const found = (text: string, start: number, candidates: Print[]) =>
    candidates.flatMap(({ length, roll, mac, mark }) =>
      start + length <= text.length && rollOf(text, base, start, length) === roll && macOf(text.slice(start, start + length)) === mac
        ? [{ start, end: start + length, mark }]
        : [],
    )

  const redact = (text: string, prints: Print[]) => {
    if (!prints.length || text.length < shortest) return text
    const { filter, byHead } = indexOf(prints)
    const matches: Match[] = []
    let window = rollOf(text, base, 0, shortest - 1)
    for (let start = 0; start + shortest <= text.length; start++) {
      window = (Math.imul(window, base) + text.charCodeAt(start + shortest - 1)) >>> 0
      const head = window & headMask
      if (filter[head >>> 5]! & (1 << (head & 31))) matches.push(...found(text, start, byHead.get(head) ?? []))
      window = (window - Math.imul(text.charCodeAt(start), drop)) >>> 0
    }
    return matches.length ? spliced(text, matches) : text
  }

  return { print, redact }
}

export type Redactor = ReturnType<typeof createRedactor>
