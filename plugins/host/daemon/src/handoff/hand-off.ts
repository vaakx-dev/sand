import { withSafe } from '@sand/util/boot'
import { homedir } from 'node:os'
import { hostCommand } from '../control/command'

export const handoffCommand = 'handoff'

const handoffTimeout = 5 * 60_000

export const handOff = async (home: string) => {
  const [bun, main] = await hostCommand(home)
  const proc = Bun.spawn([bun, main, '--home', home, handoffCommand], {
    cwd: homedir(),
    env: withSafe({ ...process.env }, false),
    stdin: 'ignore',
    stdout: 'inherit',
    stderr: 'inherit',
    windowsHide: true,
    timeout: handoffTimeout,
  })
  const code = await proc.exited
  return code === 0 && !proc.signalCode
}
