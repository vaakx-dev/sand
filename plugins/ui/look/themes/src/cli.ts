import { cliCommands } from '@sand/cli-commands/contract'
import { daemon, type DaemonLink } from '@sand/host-daemon/contract'
import { definePlugin } from 'drydock'
import { starters, type Theme, themeAct, themeName, themeSchema, type ThemeState } from './contract'

const usage = [
  'sand theme                    show the theme sand uses on every device',
  `sand theme set <starter>      use a starter: ${starters.map(starter => starter.key).join(', ')}`,
  'sand theme set <file.json>    use a theme saved as JSON',
  "sand theme reset              go back to sand's own look, even when a theme hides the page",
].join('\n')

const described = ({ theme }: ThemeState) =>
  theme ? [theme.name, `base ${theme.base}, accent ${theme.accent}`, theme.scene && `background ${theme.scene}`].filter(Boolean).join(' · ') : themeName(theme)

const starterOf = (name: string) => starters.find(starter => starter.key === name.toLowerCase() || themeName(starter.theme).toLowerCase() === name.toLowerCase())

const themeFrom = async (name: string): Promise<Theme | null> => {
  const starter = starterOf(name)
  if (starter) return starter.theme
  const file = Bun.file(name)
  if (!(await file.exists())) throw new Error(`${name} is neither a starter nor a JSON file`)
  return themeSchema().parse(await file.json())
}

type Action = (link: DaemonLink) => Promise<string>

const actionOf = ([action = 'read', name, ...rest]: string[]): Action | undefined => {
  if (rest.length) return undefined
  if (action === 'read' && !name) return async link => described(await link.call(themeAct, { action: 'read' }))
  if (action === 'reset' && !name) return async link => (await link.call(themeAct, { action: 'reset' }), "Back to sand's own look on every device")
  if (action !== 'set' || !name) return undefined
  return async link => {
    const theme = await themeFrom(name)
    const state = await link.call(themeAct, theme ? { action: 'set', theme } : { action: 'reset' })
    return `Now ${described(state)}, on every device`
  }
}

export default definePlugin({
  name: 'themes-cli',
  description: "The sand theme command: show the theme, set one, or reset it to sand's own look",
  inject: { cliCommands, daemon },
  apply(ctx) {
    ctx.effect(() =>
      ctx.cliCommands.register({
        name: 'theme',
        summary: "show the theme, set one, or reset it to sand's own look",
        usage,
        async run(args) {
          const action = actionOf(args)
          if (!action) {
            console.error(`usage:\n${usage}`)
            return 2
          }
          const link = await ctx.daemon.link()
          try {
            console.log(await action(link))
            return 0
          } finally {
            link.close()
          }
        },
      }),
    )
  },
})
