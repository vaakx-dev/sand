import type { Size } from '../contract'
import { hasChildren } from './children'
import { shellCommand, shellEnv } from './shell'
import type { Pc, PtyEvents } from './terminals'

const isFolder = (path: string) =>
  Bun.file(path)
    .stat()
    .then(
      stats => stats.isDirectory(),
      () => false,
    )

const spawn = (cwd: string, { cols, rows }: Size, events: PtyEvents) => {
  const decoder = new TextDecoder()
  const terminal = new Bun.Terminal({ cols, rows, data: (_, bytes) => events.output(decoder.decode(bytes, { stream: true })) })
  const command = shellCommand(process.platform, process.env, Bun.which)
  try {
    const shell = Bun.spawn(command, { cwd, env: shellEnv(process.env), terminal })
    void shell.exited.then(code => {
      terminal.close()
      events.exit(code)
    })
    return {
      write: (data: string) => void terminal.write(data),
      resize: (size: Size) => terminal.resize(size.cols, size.rows),
      busy: () => hasChildren(shell.pid),
      kill() {
        terminal.close()
        shell.kill()
      },
    }
  } catch (error) {
    terminal.close()
    throw error
  }
}

export const system: Pc = { platform: process.platform, isFolder, spawn }
