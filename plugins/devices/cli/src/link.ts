import type { Daemon, DaemonLink } from '@sand/host-daemon/contract'

export const withLink = async <T>(daemon: Daemon, use: (link: DaemonLink) => Promise<T>) => {
  const link = await daemon.link()
  try {
    return await use(link)
  } finally {
    link.close()
  }
}
