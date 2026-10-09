import type { Command, RelayContributions } from '../contract'

class Slots<T> {
  private entries: { key: string; value: T }[] = []

  constructor(private changed: () => void) {}

  add(key: string, value: T) {
    const entry = { key, value }
    this.entries.push(entry)
    this.changed()
    return () => {
      this.entries = this.entries.filter(other => other !== entry)
      this.changed()
    }
  }

  get(key: string) {
    return this.entries.findLast(entry => entry.key === key)?.value
  }

  list() {
    return [...new Map(this.entries.map(entry => [entry.key, entry.value])).values()]
  }
}

export class Contributions {
  readonly commands: Slots<Command>

  constructor(changed: () => void) {
    this.commands = new Slots(changed)
  }

  describe(): RelayContributions {
    return {
      commands: this.commands.list().map(({ name, title, description, args }) => ({ name, description, ...(title && { title }), ...(args && { args }) })),
    }
  }
}
