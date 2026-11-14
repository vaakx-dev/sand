import { readdir, readlink } from 'node:fs/promises'
import { ipv6Host, type Listener } from './host'

const LISTEN_STATE = '0A'
const TABLES = ['/proc/net/tcp', '/proc/net/tcp6']

const bytesOf = (hex: string) => Array.from({ length: hex.length / 2 }, (_, index) => Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16))

const littleEndianWords = (hex: string) => Array.from({ length: hex.length / 8 }, (_, index) => bytesOf(hex.slice(index * 8, index * 8 + 8)).reverse()).flat()

const hostOf = (hex: string) => {
  const bytes = littleEndianWords(hex)
  if (bytes.length === 4) return bytes.join('.')
  return ipv6Host(Array.from({ length: 8 }, (_, index) => (bytes[index * 2]! << 8) | bytes[index * 2 + 1]!))
}

const socketsIn = async (table: string) => {
  const text = await Bun.file(table)
    .text()
    .catch(() => '')
  return text
    .split('\n')
    .slice(1)
    .map(line => line.trim().split(/\s+/))
    .filter(fields => fields[3] === LISTEN_STATE)
    .map(fields => {
      const [address = '', port = ''] = (fields[1] ?? '').split(':')
      return { inode: fields[9] ?? '', host: hostOf(address), port: Number.parseInt(port, 16) }
    })
}

const socketInodesOf = async (pid: number) => {
  const folder = `/proc/${pid}/fd`
  const fds = await readdir(folder).catch(() => [])
  const links = await Promise.all(fds.map(fd => readlink(`${folder}/${fd}`).catch(() => '')))
  return links.flatMap(link => /^socket:\[(\d+)\]$/.exec(link)?.[1] ?? [])
}

const linuxListeners = async (pids: ReadonlySet<number>): Promise<Listener[]> => {
  const sockets = (await Promise.all(TABLES.map(socketsIn))).flat()
  if (!sockets.length) return []
  const owners = await Promise.all([...pids].map(async pid => ({ pid, inodes: await socketInodesOf(pid) })))
  const ownerOf = new Map(owners.flatMap(({ pid, inodes }) => inodes.map(inode => [inode, pid] as const)))
  return sockets.flatMap(({ inode, host, port }) => {
    const pid = ownerOf.get(inode)
    return pid === undefined ? [] : [{ pid, port, host }]
  })
}

export { linuxListeners }
