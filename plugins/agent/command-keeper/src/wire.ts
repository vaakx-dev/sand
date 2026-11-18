import { createHash } from 'node:crypto'
import type { Socket } from 'node:net'
import { join } from 'node:path'
import { z } from 'zod'
import { type KeptCommand, launchInput } from './contract'

export interface Place {
  path: string
  tokenFile: string
}

const VERSION = 1

const kept: z.ZodType<KeptCommand> = launchInput.omit({ argv: true, verbatim: true }).extend({
  pid: z.number(),
  started: z.number(),
  output: z.object({ text: z.string(), start: z.number() }),
  code: z.number().optional(),
})

const order = z.discriminatedUnion('type', [
  z.object({ type: z.literal('hello'), token: z.string() }),
  z.object({ type: z.literal('start'), launch: launchInput }),
  z.object({ type: z.literal('kept') }),
  z.object({ type: z.literal('stop'), id: z.string() }),
  z.object({ type: z.literal('hold') }),
])

const report = z.discriminatedUnion('type', [
  z.object({ type: z.literal('welcome') }),
  z.object({ type: z.literal('started'), command: kept }),
  z.object({ type: z.literal('failed'), id: z.string(), error: z.string() }),
  z.object({ type: z.literal('output'), id: z.string(), text: z.string() }),
  z.object({ type: z.literal('exit'), id: z.string(), code: z.number() }),
  z.object({ type: z.literal('kept'), commands: z.array(kept) }),
])

export type Order = z.infer<typeof order>

export type Report = z.infer<typeof report>

const homeKey = (home: string) => createHash('sha256').update(home).digest('hex').slice(0, 16)

export const placeOf = (home: string): Place => ({
  path: process.platform === 'win32' ? `\\\\.\\pipe\\sand-keeper-${VERSION}-${homeKey(home)}` : join(home, `keeper-${VERSION}.sock`),
  tokenFile: join(home, `keeper-${VERSION}.token`),
})

const parsed = <T>(schema: z.ZodType<T>, line: string) => {
  try {
    return schema.safeParse(JSON.parse(line)).data
  } catch {
    return undefined
  }
}

const readLines = <T>(socket: Socket, schema: z.ZodType<T>, take: (message: T | undefined) => void) => {
  let partial = ''
  socket.setEncoding('utf8')
  socket.on('data', (chunk: string) => {
    const lines = (partial + chunk).split('\n')
    partial = lines.pop() ?? ''
    for (const line of lines) take(parsed(schema, line))
  })
}

export const readOrders = (socket: Socket, take: (order: Order | undefined) => void) => readLines(socket, order, take)

export const readReports = (socket: Socket, take: (report: Report | undefined) => void) => readLines(socket, report, take)

export const send = (socket: Socket, message: Order | Report) => void socket.write(`${JSON.stringify(message)}\n`)
