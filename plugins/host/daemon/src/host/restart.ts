import { errorMessage } from '@sand/util'
import { healthText, restorePrevious } from '@sand/util/boot'
import { checkHealth } from '../control/health'
import { start } from '../control/start'
import { stop } from '../control/stop'
import { handOff } from '../handoff/hand-off'

const startWait = 90_000

const handedOff = async (home: string) => {
  try {
    return await handOff(home)
  } catch (error) {
    console.error(`could not hand over to the new sand: ${errorMessage(error)}`)
    return false
  }
}

const stopLeftover = async (home: string) => {
  try {
    const pid = await stop(home)
    if (pid) console.error(`stopped the new sand (pid ${pid})`)
  } catch (error) {
    console.error(`could not stop the new sand: ${errorMessage(error)}`)
  }
}

const startPrevious = async (home: string) => {
  try {
    await restorePrevious(home)
    console.error('went back to the previous sand build')
    const info = await start(home, { wait: startWait, stopOnFail: true })
    console.log(`restarted sand (pid ${info.pid})`)
    return info
  } catch (error) {
    console.error(`could not restart sand: ${errorMessage(error)}`)
  }
}

const rollBack = async (home: string) => {
  await stopLeftover(home)
  const info = await startPrevious(home)
  if (!info) return
  const outcome = await checkHealth(home, info)
  if (outcome.ok) console.log('the previous sand build is healthy')
  else console.error(`the previous sand build is not healthy either:\n${healthText(outcome)}`)
}

export const restartHost = async (home: string): Promise<void> => {
  const awake = setInterval(() => {}, 60_000)
  try {
    if (!(await handedOff(home))) await rollBack(home)
  } finally {
    clearInterval(awake)
  }
}
