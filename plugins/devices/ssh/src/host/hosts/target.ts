export interface Target {
  user?: string
  host: string
  port?: number
}

const shape = /^(?:ssh:\/\/)?(?:([^@\s/]+)@)?(?:\[([0-9A-Fa-f:.%\w]+)\]|([^\s:@/[\]]+))(?::(\d{1,5}))?\/?$/

export const parseTarget = (text: string): Target | undefined => {
  const match = shape.exec(text.trim())
  if (!match) return undefined
  const [, user, bracketed, plain, port] = match
  const host = bracketed ?? plain ?? ''
  const number = port === undefined ? undefined : Number(port)
  if (host.startsWith('-') || user?.startsWith('-')) return undefined
  if (number !== undefined && (number < 1 || number > 65535)) return undefined
  return { ...(user && { user }), host, ...(number !== undefined && { port: number }) }
}

export const destinationArgs = ({ user, host, port }: Target) => [...(port ? ['-p', String(port)] : []), user ? `${user}@${host}` : host]

export const destinationOf = (text: string) => {
  const target = parseTarget(text)
  if (!target) throw new Error(`${text} isn't an SSH host; use a host from your SSH config or type user@host:port`)
  return destinationArgs(target)
}

export const shownTarget = (resolved: string) => {
  const values = new Map(
    resolved.split(/\r?\n/).map(line => {
      const [key = '', ...rest] = line.trim().split(' ')
      return [key.toLowerCase(), rest.join(' ')]
    }),
  )
  const port = values.get('port')
  return `${values.get('user')}@${values.get('hostname')}${port && port !== '22' ? `:${port}` : ''}`
}
