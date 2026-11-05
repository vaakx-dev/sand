import { describe, expect, test } from 'bun:test'
import { unit } from '../src/startup/platforms/linux'
import { launchAgent } from '../src/startup/platforms/mac'
import { taskXml } from '../src/startup/platforms/windows'

describe('service files keep every argument whole', () => {
  test('the systemd unit quotes arguments and escapes specifiers and variables', () => {
    const entry = { name: 'sand-1', home: '/home/a b/50%', command: ['/opt/my sand/bun', 'main.ts', '--home', '/home/a b/$x "y"', 'service', 'run'] }
    const text = unit(entry, '/usr/bin:/a b')
    expect(text).toContain('ExecStart="/opt/my sand/bun" "main.ts" "--home" "/home/a b/$$x \\"y\\"" "service" "run"\n')
    expect(text).toContain('Environment="PATH=/usr/bin:/a b"\n')
    expect(text).toContain('Description=Keeps sand running for /home/a b/50%%\n')
  })

  test('the launch agent lists each argument as its own escaped string', () => {
    const entry = { name: 'sand-1', home: '/Users/a & b/.sand', command: ['/Users/a & b/.sand/bin/sand', '--home', '/Users/a & b/.sand', 'service', 'run'] }
    const text = launchAgent(entry, '/usr/bin')
    expect(text).toContain(
      [
        '    <string>/Users/a &amp; b/.sand/bin/sand</string>',
        '    <string>--home</string>',
        '    <string>/Users/a &amp; b/.sand</string>',
        '    <string>service</string>',
        '    <string>run</string>',
      ].join('\n'),
    )
  })

  test('the scheduled task runs hidden with Windows command line quoting', () => {
    const entry = { name: 'sand-1', home: 'C:\\Users\\A & B\\', command: ['C:\\Program Files\\bun.exe', 'C:\\sand\\main.ts', '--home', 'C:\\Users\\A & B\\', 'service', 'run'] }
    const text = taskXml(entry, 'PC\\a')
    expect(text).toContain(
      '<Command>conhost.exe</Command><Arguments>--headless "C:\\Program Files\\bun.exe" C:\\sand\\main.ts --home "C:\\Users\\A &amp; B\\\\" service run</Arguments>',
    )
    expect(text).toContain('<LogonTrigger><UserId>PC\\a</UserId></LogonTrigger>')
  })
})
