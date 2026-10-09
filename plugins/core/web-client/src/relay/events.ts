import type { WireEvent, WireRequest } from '@sand/protocol'
import type { UserContent } from '@sand/messages'
import type { OpenedSession, RelayEvent, RelayInput, RelayPick } from '@sand/server/contract'
import type { Threads, Wire } from '../contract'
import type { Context } from 'drydock'
import { promptPicker } from './fallback'
import { relayContributions } from './contributions'

type Adopt = (opened: OpenedSession) => { id: string }

type Call = (request: WireRequest) => Promise<unknown>

export const isRelayEvent = (event: WireEvent): event is RelayEvent => event.name.startsWith('ui.')

export const relayEvents = (ctx: Context, call: Call, threads: Threads, adopt: Adopt, device?: string) => {
  const picker = () => ctx.picker ?? promptPicker

  const pick = async ({ id, title, items, options }: RelayPick) => {
    const picked = await picker().choose(title, items.map((item, index) => ({ ...item, value: index })), options)
    await call({ type: 'ui.pick.result', pick: id, index: picked?.value ?? null, action: picked?.action, query: picked?.query })
  }

  const input = async ({ id, title, value }: RelayInput) => {
    const answer = await picker().input(title, value)
    await call({ type: 'ui.input.result', input: id, value: answer ?? null })
  }

  const open = async (opened: OpenedSession | null, draft?: string, cwd?: string) => {
    if (opened) await threads.select(adopt(opened).id)
    else if (cwd) await threads.draft(cwd, device)
    else await threads.select(undefined)
    if (draft !== undefined) ctx.composer?.set(draft)
  }

  const attach = (content: UserContent) => {
    if (ctx.composer) ctx.composer.attach([content])
    else ctx.notify?.push('No composer is loaded to attach to', { level: 'error' })
  }

  const notify = (text: string, level?: 'info' | 'error') => {
    if (ctx.notify) ctx.notify.push(text, { level })
    else (level === 'error' ? console.error : console.log)(text)
  }

  return (event: RelayEvent) => {
    switch (event.name) {
      case 'ui.notify':
        return notify(event.args[0], event.args[1])
      case 'ui.report':
        return ctx.notify ? ctx.notify.report(event.args[0], event.args[1]) : console.log(event.args[0], event.args[1])
      case 'ui.pick':
        return void pick(event.args[0]).catch(() => {})
      case 'ui.input':
        return void input(event.args[0]).catch(() => {})
      case 'ui.open':
        return void open(event.args[0], event.args[1] ?? undefined, event.args[2] ?? undefined)
      case 'ui.attach':
        return attach(event.args[0])
      case 'ui.prepare':
        return ctx.models?.prepare(event.args[0])
    }
  }
}

export const bridgeRelay = (ctx: Context, wire: Wire, threads: Threads, adopt: Adopt) => {
  const contributions = relayContributions(ctx, wire, threads)
  const other = relayEvents(ctx, request => wire.call(request), threads, adopt)

  const handle = (event: RelayEvent) => {
    if (event.name === 'ui.relay') return contributions.advertise(event.args[0])
    other(event)
  }

  ctx.on('wire.hello', hello => contributions.reset(hello.relay))
  ctx.on('wire.event', event => {
    if (isRelayEvent(event)) handle(event)
  })
}
