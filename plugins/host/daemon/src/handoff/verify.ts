import { errorMessage } from '@sand/util'
import { healthText } from '@sand/util/boot'
import { checkHealth } from '../control/health'
import { start } from '../control/start'
import { stop } from '../control/stop'

const startWait = 90_000

const startSelf = async (home: string) => {
  try {
    return await start(home, { wait: startWait, stopOnFail: true })
  } catch (error) {
    console.error(`the new sand did not start: ${errorMessage(error)}`)
  }
}

export const startVerified = async (home: string) => {
  process.exitCode = 1
  const info = await startSelf(home)
  if (!info) return 1
  const outcome = await checkHealth(home, info)
  if (outcome.ok) {
    console.log(`restarted sand (pid ${info.pid})`)
    return 0
  }
  console.error(`the new sand is not healthy:\n${healthText(outcome)}`)
  await stop(home)
  return 1
}
