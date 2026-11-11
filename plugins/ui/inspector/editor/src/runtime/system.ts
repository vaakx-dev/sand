import type { Where } from './editors'
import type { Launch } from './open'

const windows = process.platform === 'win32'

const appAliases = windows && process.env.LOCALAPPDATA ? `${process.env.LOCALAPPDATA}\\Microsoft\\WindowsApps` : undefined

export const system: Where = {
  platform: process.platform,
  which: command => Bun.which(command) ?? (appAliases && Bun.which(command, { PATH: appAliases })) ?? undefined,
  isFolder: path =>
    Bun.file(path)
      .stat()
      .then(
        stats => stats.isDirectory(),
        () => false,
      ),
}

export const launch: Launch = (command, folder) => {
  Bun.spawn(command, { cwd: folder, stdio: ['ignore', 'ignore', 'ignore'], detached: !windows, windowsHide: true }).unref()
}
