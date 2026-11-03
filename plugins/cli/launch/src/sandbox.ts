import { pairLink } from '@sand/devices-contract'
import { daemonService } from '@sand/host-daemon/service'
import { cpSync, existsSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pageUrl } from './page-url'

const settings = '[host]\nport = 0\n\n[plugins.devices-network]\nenabled = false\n'

const borrowed = ['plugins', 'model.json', 'sub-model.json']

const copyBorrowed = (home: string, box: string) => {
  for (const name of borrowed) {
    const from = join(home, name)
    if (existsSync(from)) cpSync(from, join(box, name), { recursive: true })
  }
}

export const sandbox = async (home: string) => {
  const box = mkdtempSync(join(tmpdir(), 'sand-sandbox-'))
  await Bun.write(join(box, 'sand.toml'), settings)
  copyBorrowed(home, box)
  const daemon = daemonService(box)
  const { info } = await daemon.ensure()
  const { token } = await daemon.request(pairLink, { kind: 'device' })
  console.log(
    [
      `started a throwaway sand (pid ${info.pid}) in ${box}`,
      `open it paired: ${pageUrl(info.url, token)}`,
      `stop it: sand --home "${box}" stop, then delete the folder`,
    ].join('\n'),
  )
}
