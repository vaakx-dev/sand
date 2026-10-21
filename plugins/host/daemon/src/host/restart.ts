import type { ServerInfo } from '@sand/host-gateway/contract'
import { hostHealthRequest } from '@sand/host-health/contract'
import { errorMessage } from '@sand/util'
import { healthText, restorePrevious, waitHealthy } from '@sand/util/boot'
import { ask } from '../control/ask'
import { start } from '../control/start'
import { stop } from '../control/stop'

const startWait = 90_000
const healthWait = 120_000

const launch = async (home: string) => {
  const info = await start(home, { wait: startWait, stopOnFail: true })
  console.log(`restarted sand (pid ${info.pid})`)
  return info
}

const checkHealth = (info: ServerInfo) => waitHealthy(() => ask(info, hostHealthRequest, {}, 10_000), { timeout: healthWait })

const rollback = async (home: string) => {
  try {
    await restorePrevious(home)
    console.error('went back to the previous sand build')
    return await launch(home)
  } catch (error) {
    console.error(`could not restart sand: ${errorMessage(error)}`)
  }
}

const reportPrevious = async (info: ServerInfo) => {
  const outcome = await checkHealth(info)
  if (outcome.ok) console.log('the previous sand build is healthy')
  else console.error(`the previous sand build is not healthy either:\n${healthText(outcome)}`)
}

const rollbackUnhealthy = async (home: string) => {
  try {
    await stop(home)
  } catch (error) {
    console.error(`could not stop the new sand: ${errorMessage(error)}`)
  }
  const info = await rollback(home)
  if (info) await reportPrevious(info)
}

const startNew = async (home: string) => {
  try {
    return await launch(home)
  } catch (error) {
    console.error(`the new sand did not start: ${errorMessage(error)}`)
    await rollback(home)
  }
}

export const restartHost = async (home: string): Promise<void> => {
  const info = await startNew(home)
  if (!info) return
  const outcome = await checkHealth(info)
  if (outcome.ok) return
  console.error(`the new sand is not healthy:\n${healthText(outcome)}`)
  await rollbackUnhealthy(home)
}
