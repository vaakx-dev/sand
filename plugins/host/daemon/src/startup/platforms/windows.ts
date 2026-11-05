import { rm } from 'node:fs/promises'
import { tmpdir, userInfo } from 'node:os'
import { join } from 'node:path'
import type { Entry } from '../entry'
import { mustRun, succeeds } from '../exec'
import type { Platform } from '../platform'
import { xmlText } from './xml'

const quoteArg = (arg: string) => (/^[^\s"]+$/.test(arg) ? arg : `"${arg.replace(/(\\*)"/g, '$1$1\\"').replace(/(\\+)$/, '$1$1')}"`)

const currentUser = () => [process.env.USERDOMAIN, userInfo().username].filter(Boolean).join('\\')

export const taskXml = ({ home, command }: Entry, user: string) =>
  [
    '<?xml version="1.0" encoding="UTF-16"?>',
    '<Task version="1.2" xmlns="http://schemas.microsoft.com/windows/2004/02/mit/task">',
    `  <RegistrationInfo><Description>${xmlText(`Keeps sand running for ${home}`)}</Description></RegistrationInfo>`,
    `  <Triggers><LogonTrigger><UserId>${xmlText(user)}</UserId></LogonTrigger></Triggers>`,
    '  <Principals>',
    `    <Principal id="Author"><UserId>${xmlText(user)}</UserId><LogonType>InteractiveToken</LogonType><RunLevel>LeastPrivilege</RunLevel></Principal>`,
    '  </Principals>',
    '  <Settings>',
    '    <MultipleInstancesPolicy>IgnoreNew</MultipleInstancesPolicy>',
    '    <DisallowStartIfOnBatteries>false</DisallowStartIfOnBatteries>',
    '    <StopIfGoingOnBatteries>false</StopIfGoingOnBatteries>',
    '    <ExecutionTimeLimit>PT0S</ExecutionTimeLimit>',
    '  </Settings>',
    '  <Actions Context="Author">',
    `    <Exec><Command>conhost.exe</Command><Arguments>${xmlText(['--headless', ...command].map(quoteArg).join(' '))}</Arguments></Exec>`,
    '  </Actions>',
    '</Task>',
    '',
  ].join('\r\n')

export const windows: Platform = {
  startsWhen: 'when you sign in to Windows',
  unattended: 'to have it start after a reboot with nobody at the PC, turn on automatic sign-in for this account',
  where: ({ name }) => `Task Scheduler task ${name}`,
  installed: async ({ name }) => succeeds(['schtasks', '/Query', '/TN', name]),
  async install(entry) {
    const file = join(tmpdir(), `${entry.name}.xml`)
    await Bun.write(file, Buffer.from(`\ufeff${taskXml(entry, currentUser())}`, 'utf16le'))
    try {
      mustRun(['schtasks', '/Create', '/TN', entry.name, '/XML', file, '/F'])
    } finally {
      await rm(file, { force: true })
    }
    mustRun(['schtasks', '/Run', '/TN', entry.name])
  },
  uninstall: async ({ name }) => mustRun(['schtasks', '/Delete', '/TN', name, '/F']),
}
