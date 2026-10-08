import { isAlive, running } from './info'

export const stop = async (home: string) => {
  const info = await running(home)
  if (!info) return console.log('sand is not running')
  process.kill(info.pid, 'SIGINT')
  for (let tries = 0; tries < 100 && isAlive(info.pid); tries++) await Bun.sleep(100)
  if (isAlive(info.pid)) process.kill(info.pid, 'SIGTERM')
  console.log(`stopped sand (pid ${info.pid})`)
}
