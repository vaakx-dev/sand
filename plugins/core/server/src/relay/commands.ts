import type { Command, RelayContributions } from '../contract'

const describe = ({ name, title, description, args }: Command) => ({ name, description, ...(title && { title }), ...(args && { args }) })

export const createCommands = (changed: () => void) => {
  let added: Command[] = []

  const add = (command: Command) => {
    added.push(command)
    changed()
    return () => {
      added = added.filter(other => other !== command)
      changed()
    }
  }

  const get = (name: string) => added.findLast(command => command.name === name)

  const contributions = (): RelayContributions => ({
    commands: [...new Map(added.map(command => [command.name, command])).values()].map(describe),
  })

  return { add, get, contributions }
}

export type Commands = ReturnType<typeof createCommands>
