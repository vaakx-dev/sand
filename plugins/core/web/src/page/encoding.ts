export type Encoding = 'br' | 'gzip'

const accepted = (header: string) =>
  new Map(
    header.split(',').map(part => {
      const [name = '', ...params] = part.trim().toLowerCase().split(';')
      const q = params.map(param => param.trim()).find(param => param.startsWith('q='))
      return [name.trim(), q ? Number(q.slice(2)) : 1] as const
    }),
  )

export const pickEncoding = (header: string | null): Encoding | undefined => {
  if (!header) return undefined
  const weights = accepted(header)
  const weight = (name: string) => weights.get(name) ?? weights.get('*') ?? 0
  return (['br', 'gzip'] as const).find(name => weight(name) > 0)
}
