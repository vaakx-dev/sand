import { start } from '@sand/process-tree'
import type { CommandSpec, KeptCommand, Launch } from './contract'
import { outputTail, type OutputTail } from './output'

interface KeeperHooks {
  started(command: KeptCommand): void
  output(id: string, text: string): void
  exit(last: KeptCommand, code: number): void
}

interface Held {
  spec: CommandSpec
  pid: number
  started: number
  output: OutputTail
  kill(): Promise<void>
}

const keptOf = ({ spec, pid, started, output }: Held): KeptCommand => ({ ...spec, pid, started, output: output.snapshot() })

export class Keeper {
  readonly #held = new Map<string, Held>()
  readonly #hooks: KeeperHooks

  constructor(hooks: KeeperHooks) {
    this.#hooks = hooks
  }

  start({ argv, verbatim, ...spec }: Launch) {
    const output = outputTail()
    const running = start(
      argv,
      text => {
        output.write(text)
        this.#hooks.output(spec.id, text)
      },
      { cwd: spec.cwd, verbatim },
    )
    const held: Held = { spec, pid: running.pid, started: Date.now(), output, kill: running.kill }
    this.#held.set(spec.id, held)
    void running.exited.then(code => {
      this.#held.delete(spec.id)
      this.#hooks.exit(keptOf(held), code)
    })
    this.#hooks.started(keptOf(held))
    return running.pid
  }

  kept() {
    return [...this.#held.values()].map(keptOf)
  }

  holds() {
    return this.#held.size > 0
  }

  async stop(id: string) {
    await this.#held.get(id)?.kill()
  }

  async close() {
    await Promise.all([...this.#held.values()].map(held => held.kill()))
  }
}
