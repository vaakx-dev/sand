import { cliCommands } from '@sand/cli-commands/contract'
import { daemon, type DaemonLink } from '@sand/host-daemon/contract'
import { definePlugin } from 'drydock'
import { type Level, levels, levelSet, levelsGet, levelSource, type LevelPicks } from './contract'

type Action = (link: DaemonLink) => Promise<LevelPicks>

const usage = [
  'sand model                              show the model and effort of each level',
  'sand model <level> <model> [<effort>]   set a level: bot, main, sub, light or background',
  'sand model <level> effort <effort>      set only its effort',
  'sand model <level> clear                use the next heavier level instead',
].join('\n')

const isLevel = (value: string | undefined): value is Level => levels.some(level => level === value)

const pickText = (picks: LevelPicks, level: Level) => {
  const source = levelSource(picks, level)
  const { model, effort } = picks[source] ?? {}
  const chosen = [model ?? 'none', effort].filter(Boolean).join(' · ')
  return source === level ? chosen : `${chosen} (from ${source})`
}

const printPicks = (picks: LevelPicks) => {
  for (const level of levels) console.log(`${level.padEnd(12)}${pickText(picks, level)}`)
}

const setAction = (level: Level, [first, second, ...rest]: string[]): Action | undefined => {
  if (rest.length || !first) return undefined
  if (first === 'clear') return second ? undefined : link => link.call(levelSet, { level, model: null })
  if (first === 'effort') return second ? link => link.call(levelSet, { level, effort: second }) : undefined
  return link => link.call(levelSet, { level, model: first, ...(second && { effort: second }) })
}

const actionOf = ([level, ...rest]: string[]): Action | undefined => {
  if (level === undefined) return link => link.call(levelsGet, {})
  return isLevel(level) ? setAction(level, rest) : undefined
}

export default definePlugin({
  name: 'model-cli',
  description: 'The sand model command: show or set the model and effort of each level',
  inject: { cliCommands, daemon },
  apply(ctx) {
    ctx.effect(() =>
      ctx.cliCommands.register({
        name: 'model',
        summary: 'show or set the model and effort of each level',
        usage,
        async run(args) {
          const action = actionOf(args)
          if (!action) {
            console.error(`usage:\n${usage}`)
            return 2
          }
          const link = await ctx.daemon.link()
          try {
            printPicks(await action(link))
            return 0
          } finally {
            link.close()
          }
        },
      }),
    )
  },
})
