import { z } from 'zod'

const strings = z.record(z.string(), z.string()).default({})

const stdio = z.strictObject({
  command: z.string().min(1),
  args: z.array(z.string()).default([]),
  env: strings,
  cwd: z.string().optional(),
})

const http = z.strictObject({
  url: z.url({ protocol: /^https?$/ }),
  headers: strings,
})

export const serverConfig = z.union([stdio, http])

export type ServerConfig = z.output<typeof serverConfig>

export const serverName = z.string().regex(/^[a-z0-9][a-z0-9_-]*$/, 'MCP server names use lowercase letters, digits, - and _')

const variable = /\$\{([A-Za-z_][A-Za-z0-9_]*)\}/g

export const expand = (text: string) =>
  text.replace(variable, (_, name: string) => {
    const value = Bun.env[name]
    if (value === undefined) throw new Error(`The environment variable ${name} is not set`)
    return value
  })

export const expandAll = (values: Record<string, string>) => Object.fromEntries(Object.entries(values).map(([key, value]) => [key, expand(value)]))
