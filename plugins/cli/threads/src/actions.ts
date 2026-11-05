import type { CliValues } from '@sand/config/contract'
import {
  type Call,
  readLimit,
  type Sent,
  threadList,
  threadRead,
  threadSend,
  threadStart,
  threadStop,
  waitThread,
} from '@sand/orchestrator/contract'
import { resolve } from 'node:path'
import { printItems, printRows, printState, printStop } from './print'

type Action = (call: Call) => Promise<number>

interface Flags {
  wait: boolean
  json: boolean
  model?: string
  effort?: string
}

type Parse = (args: string[], flags: Flags, cwd: string) => Action | undefined

const text = (value: CliValues[string]) => (typeof value === 'string' ? value : undefined)

const flagsOf = (values: CliValues): Flags => ({ wait: values.wait === true, json: values.json === true, model: text(values.model), effort: text(values.effort) })

const promptOf = async (message: string) => (message === '-' ? (await Bun.stdin.text()).trimEnd() : message)

const settle = async (call: Call, sent: Sent, flags: Flags) =>
  printState(await waitThread(call, sent.thread, 'attention', flags.wait ? Infinity : Date.now()), flags.json)

const start: Parse = (args, flags, cwd) => {
  if (args.length !== 1 && args.length !== 2) return undefined
  const [dir, message] = args.length === 2 ? [args[0]!, args[1]!] : ['.', args[0]!]
  const settings = { ...(flags.model && { model: flags.model }), ...(flags.effort && { effort: flags.effort }) }
  return async call => {
    const input = { cwd: resolve(cwd, dir), prompt: await promptOf(message), ...settings, origin: 'cli', clientRequestId: Bun.randomUUIDv7() } as const
    return settle(call, await call(threadStart, input), flags)
  }
}

const send: Parse = ([session, message, ...rest], flags) => {
  if (!session || !message || rest.length) return undefined
  return async call => {
    const input = { session, prompt: await promptOf(message), origin: 'cli', clientRequestId: Bun.randomUUIDv7() } as const
    return settle(call, await call(threadSend, input), flags)
  }
}

const wait: Parse = ([session, ...rest], flags) => {
  if (!session || rest.length) return undefined
  return async call => printState(await waitThread(call, session, 'attention'), flags.json)
}

const show: Parse = ([session, ...rest], flags) => {
  if (!session || rest.length) return undefined
  return async call => {
    let page = await call(threadRead, { session, after: 0, limit: readLimit })
    const items = [...page.items]
    while (page.more) {
      page = await call(threadRead, { session, after: page.next, limit: readLimit })
      items.push(...page.items)
    }
    printItems(items, flags.json)
    return 0
  }
}

const list: Parse = (args, flags) => {
  if (args.length) return undefined
  return async call => {
    printRows(await call(threadList, {}), flags.json)
    return 0
  }
}

const stop: Parse = ([session, ...rest], flags) => {
  if (!session || rest.length) return undefined
  return async call => {
    printStop(session, await call(threadStop, { session }), flags.json)
    return 0
  }
}

const parsers = new Map(Object.entries({ start, send, wait, show, list, stop }))

export const threadAction = ([name = '', ...args]: string[], values: CliValues, cwd: string) => parsers.get(name)?.(args, flagsOf(values), cwd)
