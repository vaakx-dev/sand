import { byOrder, matching } from '@sand/util'
import { derive, sig } from '@vaakx-dev/vrui'
import type { Command, Trigger, TriggerItem } from '../contract'
import { commandChar } from './detect'

interface Ranked {
  trigger: Trigger
  order: number
}

interface CommandItem extends TriggerItem {
  command: Command
}

const commandTrigger = (commands: Command[], run: (command: Command) => void): Trigger<CommandItem> => ({
  char: commandChar,
  label: 'commands',
  items: query =>
    matching(
      commands.map(command => command.name),
      query,
      true,
    )
      .map(index => commands[index]!)
      .map(command => ({ label: command.name, description: command.description, command })),
  accept({ command }) {
    run(command)
    return ''
  },
})

export const createTriggers = (run: (command: Command) => void) => {
  const ranked = sig<Ranked[]>([])
  const commands = sig<Command[]>([])
  const list = derive(() => {
    const own = ranked.get().map(({ trigger }) => trigger)
    return commands.get().length ? [...own, commandTrigger(commands.get(), run)] : own
  })

  const add = <T extends TriggerItem>(trigger: Trigger<T>, order = 0) => {
    const added: Ranked = { trigger, order }
    ranked.update(all => [...all, added].sort(byOrder))
    return () => ranked.update(all => all.filter(other => other !== added))
  }

  const addCommand = (command: Command) => {
    commands.update(all => [...all, command])
    return () => commands.update(all => all.filter(other => other !== command))
  }

  return { list, add, addCommand, named: (name: string) => commands.get().find(command => command.name === name) }
}

export type Triggers = ReturnType<typeof createTriggers>
