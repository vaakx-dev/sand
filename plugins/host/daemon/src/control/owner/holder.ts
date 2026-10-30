import { readServerInfo } from '@sand/util/boot'
import { isAlive } from '../info'

const portOpen = async (url: string) => {
  const { hostname, port } = new URL(url)
  try {
    const socket = await Bun.connect({ hostname, port: Number(port), socket: { data() {} } })
    socket.end()
    return true
  } catch {
    return false
  }
}

export const portHolder = async (home: string) => {
  const info = await readServerInfo(home)
  if (!info || info.pid === process.pid || !isAlive(info.pid)) return
  return (await portOpen(info.url)) ? info : undefined
}
