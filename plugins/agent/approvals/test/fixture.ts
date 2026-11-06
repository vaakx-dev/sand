import { type SandOptions, startSand } from '@sand/harness'
import type { Source } from '@sand/replay/contract'
import { tools } from '@sand/tools/contract'
import { z } from 'zod'
import { approvalAsked, type Decision } from '../src/contract'

export const said = (text: string) => ({ type: 'text', text }) as const

export const shellReplies: Source['replies'] = [
  [said('Checking.'), { type: 'call', name: 'shell', input: { command: 'echo approved' } }],
  [said('Done.')],
]

export const start = (replies: Source['replies'], { home, plugins = [] }: SandOptions = {}) =>
  startSand([{ id: 'fake', models: ['m'], replies, api: 'anthropic' }], { plugins: ['agent/approvals', ...plugins], ...(home && { home }) })

export type Sand = Awaited<ReturnType<typeof start>>

export const mailer = (sand: Sand) => {
  const sent: string[] = []
  sand.app.get(tools)!.register({
    name: 'send_mail',
    description: 'Send a mail',
    input: z.object({ to: z.string() }),
    act: ({ to }) => ({ effect: 'send', summary: `Mail ${to}` }),
    run({ to }) {
      sent.push(to)
      return `Sent to ${to}`
    },
  })
  return sent
}

export const nextAsk = (sand: Sand) =>
  new Promise<Decision>(resolve => {
    const stop = sand.app.on(approvalAsked, decision => {
      stop()
      resolve(decision)
    })
  })
