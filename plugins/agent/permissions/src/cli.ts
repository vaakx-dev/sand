import { cliCommands } from '@sand/cli-commands/contract'
import { daemon, type DaemonLink } from '@sand/host-daemon/contract'
import { plural } from '@sand/util'
import { definePlugin } from 'drydock'
import { type Mode, modes, type ModeState, permissionDeadline, permissionMode, permissionModeSet } from './contract'

type Action = (link: DaemonLink) => Promise<number>

const usage = [
  'sand permissions thread <id> [off|ask|auto]   show or set a thread’s permission mode',
  'sand permissions bot <id> [off|ask|auto]      show or set a bot’s permission mode; threads it starts follow it',
  'sand permissions deadline <minutes>            how long a question waits before its call is denied',
].join('\n')

const isMode = (value: string | undefined): value is Mode => modes.some(mode => mode === value)

const owners = ['thread', 'bot'] as const

const isOwner = (value: string | undefined): value is (typeof owners)[number] => owners.some(owner => owner === value)

const stateLine = ({ mode, from, strict }: ModeState) =>
  [mode, from && `from ${from.owner} ${from.id}`, strict && mode !== 'off' && 'stricter: started by a bot'].filter(Boolean).join(', ')

const modeAction = (owner: 'thread' | 'bot', id: string, mode: string | undefined): Action | undefined => {
  if (mode !== undefined && !isMode(mode)) return undefined
  return async link => {
    const state = mode ? await link.call(permissionModeSet, { owner, id, mode }) : await link.call(permissionMode, { owner, id })
    console.log(stateLine(state))
    return 0
  }
}

const deadlineAction = (minutes: number): Action | undefined => {
  if (!Number.isInteger(minutes) || minutes < 1) return undefined
  return async link => {
    const { deadlineMinutes } = await link.call(permissionDeadline, { minutes })
    console.log(`Questions wait ${plural(deadlineMinutes, 'minute')} before their call is denied`)
    return 0
  }
}

const actionOf = ([first, second, third, ...rest]: string[]): Action | undefined => {
  if (rest.length) return undefined
  if (first === 'deadline' && second && third === undefined) return deadlineAction(Number(second))
  if (isOwner(first) && second) return modeAction(first, second, third)
  return undefined
}

export default definePlugin({
  name: 'permissions-cli',
  description: 'The sand permissions command: show or set the permission mode of a thread or bot, and how long questions wait',
  inject: { cliCommands, daemon },
  apply(ctx) {
    ctx.effect(() =>
      ctx.cliCommands.register({
        name: 'permissions',
        summary: 'show or set the permission mode of a thread or bot',
        usage,
        async run(args) {
          const action = actionOf(args)
          if (!action) {
            console.error(`usage:\n${usage}`)
            return 2
          }
          const link = await ctx.daemon.link()
          try {
            return await action(link)
          } finally {
            link.close()
          }
        },
      }),
    )
  },
})
