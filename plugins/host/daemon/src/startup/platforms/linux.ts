import { mkdir, rm } from 'node:fs/promises'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import type { Entry } from '../entry'
import { mustRun } from '../exec'
import type { Platform } from '../platform'

const unitName = ({ name }: Entry) => `${name}.service`

const unitFile = (entry: Entry) => join(process.env.XDG_CONFIG_HOME ?? join(homedir(), '.config'), 'systemd', 'user', unitName(entry))

const specifiers = (value: string) => value.replaceAll('%', '%%')

const quoted = (value: string) => `"${specifiers(value.replace(/[\\"]/g, '\\$&'))}"`

const execArg = (arg: string) => quoted(arg).replaceAll('$', '$$$$')

const systemctl = (...args: string[]) => mustRun(['systemctl', '--user', ...args])

export const unit = (entry: Entry, path: string) =>
  [
    '[Unit]',
    `Description=${specifiers(`Keeps sand running for ${entry.home}`)}`,
    '',
    '[Service]',
    `ExecStart=${entry.command.map(execArg).join(' ')}`,
    `Environment=${quoted(`PATH=${path}`)}`,
    'Restart=on-failure',
    'RestartSec=10',
    'KillMode=process',
    '',
    '[Install]',
    'WantedBy=default.target',
    '',
  ].join('\n')

export const linux: Platform = {
  startsWhen: 'when you log in',
  unattended: 'to have it start at boot without logging in, run `loginctl enable-linger` (it may need sudo)',
  where: entry => `systemd user unit ${unitName(entry)}`,
  installed: entry => Bun.file(unitFile(entry)).exists(),
  async install(entry) {
    const file = unitFile(entry)
    await mkdir(dirname(file), { recursive: true })
    await Bun.write(file, unit(entry, process.env.PATH ?? ''))
    systemctl('daemon-reload')
    systemctl('enable', '--now', unitName(entry))
  },
  async uninstall(entry) {
    systemctl('disable', '--now', unitName(entry))
    await rm(unitFile(entry), { force: true })
    systemctl('daemon-reload')
  },
}
