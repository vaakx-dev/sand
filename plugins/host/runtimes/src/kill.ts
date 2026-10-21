import type { Subprocess } from 'bun'

const grace = 5_000

const windows = process.platform === 'win32'

export const running = (proc: Subprocess) => proc.exitCode === null && proc.signalCode === null

const disconnect = (proc: Subprocess) => {
  try {
    proc.disconnect()
  } catch {}
}

export const terminate = (proc: Subprocess) => {
  if (!running(proc)) return
  if (windows) disconnect(proc)
  else proc.kill('SIGTERM')
  const timer = setTimeout(() => running(proc) && proc.kill('SIGKILL'), grace)
  void proc.exited.then(() => clearTimeout(timer))
}

export const stopAll = async (procs: Subprocess[]) => {
  for (const proc of procs) {
    if (!running(proc)) continue
    if (windows) disconnect(proc)
    else proc.kill('SIGINT')
  }
  let timer: Timer | undefined
  const late = new Promise<void>(resolve => {
    timer = setTimeout(resolve, grace)
  })
  await Promise.race([Promise.all(procs.map(proc => proc.exited)), late])
  clearTimeout(timer)
  for (const proc of procs) if (running(proc)) proc.kill('SIGKILL')
}
