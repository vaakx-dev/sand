import { byOrder, matching } from '@sand/util'
import { derive, sig } from '@vaakx-dev/vrui'
import type { Command, Trigger, TriggerItem } from '../contract'
import { commandChar } from './detect'

export interface Source<T extends TriggerItem = TriggerItem> extends Trigger<T> {
  run?(item: T): void
}

interface Ranked {
  trigger: Trigger
  order: number
}

interface CommandItem extends TriggerItem {
  command: Command
}

const commandTrigger = (commands: Command[], run: (command: Command) => void): Source<CommandItem> => ({
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
  accept: ({ command }) => `${commandChar}${command.name}`,
  run: ({ command }) => run(command),
})

export const createTriggers = (run: (command: Command) => void) => {
  const ranked = sig<Ranked[]>([])
  const commands = sig<Command[]>([])
  const list = derive((): Source[] => {
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
