import { healthText, type HealthOutcome } from '@sand/boot'
import { clearUpdateNotice, rollbackBlocked, writeUpdateNotice } from '@sand/boot/notice'
import { errorMessage } from '@sand/util'
import { checkHealth } from '../control/health'
import { start } from '../control/start'
import { stop } from '../control/stop'

const startWait = 90_000
const summaryLines = 6

const startSelf = async (home: string, { safe }: { safe: boolean }) => {
  try {
    return await start(home, { wait: startWait, stopOnFail: true, safe })
  } catch (error) {
    console.error(`the new sand did not start: ${errorMessage(error)}`)
  }
}

const stayText = (problem: string, blocked: string) =>
  `sand updated, but the new build is not fully healthy: ${problem}. It stayed on the new build instead of going back, because the previous ${blocked}. Update again when a newer build is out, or run the install command to repair it.`

const problemOf = (outcome: HealthOutcome) => healthText(outcome, 0).split('\n').slice(0, summaryLines).join('; ')

const stay = async (home: string, problem: string, blocked: string) => {
  const text = stayText(problem, blocked)
  console.error(text)
  await writeUpdateNotice(home, text)
  return 0
}

export const startSafe = async (home: string, blocked: string) => {
  const info = await startSelf(home, { safe: true })
  if (!info) return 1
  return stay(home, 'it did not start with your plugins, so it runs in safe mode', blocked)
}

export const startVerified = async (home: string) => {
  process.exitCode = 1
  const info = await startSelf(home, { safe: false })
  const blocked = await rollbackBlocked(home)
  if (!info) return blocked ? startSafe(home, blocked) : 1
  const outcome = await checkHealth(home, info)
  if (outcome.ok) {
    console.log(`restarted sand (pid ${info.pid})`)
    await clearUpdateNotice(home)
    return 0
  }
  if (blocked) return stay(home, problemOf(outcome), blocked)
  console.error(`the new sand is not healthy:\n${healthText(outcome)}`)
  await stop(home)
  return 1
}
