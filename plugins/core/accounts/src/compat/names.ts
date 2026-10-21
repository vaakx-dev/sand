const allowed = /^[a-zA-Z0-9_-]{1,64}$/

const cleaned = (name: string) => name.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64) || 'tool'

export const toolNames = (names: string[]) => {
  const safeOf = new Map<string, string>()
  const originalOf = new Map<string, string>()

  const safe = (name: string) => {
    const known = safeOf.get(name)
    if (known) return known
    const base = allowed.test(name) ? name : cleaned(name)
    let candidate = base
    for (let n = 2; originalOf.has(candidate); n++) candidate = `${base.slice(0, 63 - String(n).length)}_${n}`
    safeOf.set(name, candidate)
    originalOf.set(candidate, name)
    return candidate
  }

  const unique = [...new Set(names)]
  for (const name of [...unique.filter(name => allowed.test(name)), ...unique.filter(name => !allowed.test(name))]) safe(name)

  return { safe, original: (name: string) => originalOf.get(name) ?? name }
}

export type ToolNames = ReturnType<typeof toolNames>
