import type { Subprocess } from 'bun'
import type { SleepBlock, Warn } from './block'

type Holder = Subprocess<'pipe', 'ignore', 'pipe'>

const inhibitor = (command: string[], warn: Warn): SleepBlock => {
  let holder: Holder | undefined
  let broken = false

  const watch = async (started: Holder) => {
    const [code, error] = await Promise.all([started.exited, new Response(started.stderr).text()])
    if (code === 0 || started !== holder) return
    holder = undefined
    broken = true
    warn(`${command[0]} stopped with code ${code}${error.trim() && `: ${error.trim()}`}`)
  }

  const hold = () => {
    if (holder || broken) return
    holder = Bun.spawn([...command, 'cat'], { stdin: 'pipe', stdout: 'ignore', stderr: 'pipe' })
    void watch(holder)
  }

  const release = () => {
    void holder?.stdin.end()
    holder = undefined
  }

  return { hold, release }
}

export { inhibitor }
