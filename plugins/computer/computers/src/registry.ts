import type { Action, Computer, Computers, ComputerState, Control } from './contract'

interface Entry {
  computer: Computer
  control: Control
}

const takenOver = ({ info }: Computer) =>
  new Error(`The user has taken over ${info.label}, so the agent cannot act on it. Wait until the user hands it back; you can still take screenshots.`)

export const createRegistry = (changed: () => void): Computers => {
  const entries = new Map<string, Entry>()

  const setControl = (entry: Entry, control: Control) => {
    if (entry.control === control) return
    entry.control = control
    changed()
  }

  const act = async (entry: Entry, action: Action) => {
    if (entry.control === 'agent' && (await entry.computer.humanInput())) setControl(entry, 'human')
    if (entry.control === 'human') throw takenOver(entry.computer)
    await entry.computer.act(action)
  }

  const guarded = (entry: Entry): Computer => ({
    info: entry.computer.info,
    screenshot: fit => entry.computer.screenshot(fit),
    elements: () => entry.computer.elements(),
    act: action => act(entry, action),
    humanInput: () => entry.computer.humanInput(),
  })

  return {
    register(computer) {
      const { id } = computer.info
      if (entries.has(id)) throw new Error(`A computer named "${id}" is already registered`)
      const added: Entry = { computer, control: 'agent' }
      entries.set(id, added)
      changed()
      return () => {
        if (entries.get(id) !== added) return
        entries.delete(id)
        changed()
      }
    },
    list: (): ComputerState[] => [...entries.values()].map(({ computer, control }) => ({ ...computer.info, control })),
    get(id) {
      const found = entries.get(id)
      return found && guarded(found)
    },
    control(id, control) {
      const found = entries.get(id)
      if (!found) throw new Error(`No computer named "${id}"`)
      setControl(found, control)
    },
  }
}
