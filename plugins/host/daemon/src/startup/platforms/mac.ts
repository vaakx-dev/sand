import { mkdir, rm } from 'node:fs/promises'
import { homedir, userInfo } from 'node:os'
import { dirname, join } from 'node:path'
import type { Entry } from '../entry'
import { mustRun, succeeds } from '../exec'
import type { Platform } from '../platform'
import { xmlText } from './xml'

const label = ({ name }: Entry) => `dev.vaakx.${name}`

const plistFile = (entry: Entry) => join(homedir(), 'Library', 'LaunchAgents', `${label(entry)}.plist`)

const domain = () => `gui/${userInfo().uid}`

const unload = (entry: Entry) => succeeds(['launchctl', 'bootout', `${domain()}/${label(entry)}`])

const text = (value: string) => `<string>${xmlText(value)}</string>`

export const launchAgent = (entry: Entry, path: string) =>
  [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">',
    '<plist version="1.0">',
    '<dict>',
    '  <key>Label</key>',
    `  ${text(label(entry))}`,
    '  <key>ProgramArguments</key>',
    '  <array>',
    ...entry.command.map(arg => `    ${text(arg)}`),
    '  </array>',
    '  <key>EnvironmentVariables</key>',
    '  <dict>',
    '    <key>PATH</key>',
    `    ${text(path)}`,
    '  </dict>',
    '  <key>RunAtLoad</key>',
    '  <true/>',
    '  <key>KeepAlive</key>',
    '  <dict>',
    '    <key>SuccessfulExit</key>',
    '    <false/>',
    '  </dict>',
    '</dict>',
    '</plist>',
    '',
  ].join('\n')

export const mac: Platform = {
  startsWhen: 'when you log in to this Mac',
  unattended: 'to have it start after a reboot with nobody at the Mac, turn on automatic login in System Settings',
  where: entry => `launch agent ${plistFile(entry)}`,
  installed: entry => Bun.file(plistFile(entry)).exists(),
  async install(entry) {
    const file = plistFile(entry)
    await mkdir(dirname(file), { recursive: true })
    await Bun.write(file, launchAgent(entry, process.env.PATH ?? ''))
    unload(entry)
    mustRun(['launchctl', 'bootstrap', domain(), file])
  },
  async uninstall(entry) {
    unload(entry)
    await rm(plistFile(entry), { force: true })
  },
}
