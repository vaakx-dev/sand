import type { HeadlessUI } from '../ui/service'

const unknown = (name: string, known: string[]) =>
  `There is no /${name} command${known.length ? `; try ${known.sort().map(other => `/${other}`).join(', ')}` : ''}`

export const runCommand = (ui: HeadlessUI, name: string, args: string) => {
  const command = ui.commands.get(name)
  if (!command) throw new Error(unknown(name, [...ui.commands.keys()]))
  return ui.outcome(() => command.run(args))
}
