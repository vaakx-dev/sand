import { expect, test } from 'bun:test'
import { parseInput } from '@sand/host-hub/contract'
import { editorOpen } from '../src/contract'
import { detect, type Where } from '../src/runtime/editors'
import { openFolder } from '../src/runtime/open'

const pc = (platform: NodeJS.Platform, commands: Record<string, string>, folders: string[] = []): Where => ({
  platform,
  which: command => commands[command],
  isFolder: async path => folders.includes(path),
})

const opened = async (where: Where, input: Parameters<typeof openFolder>[0]) => {
  const runs: { command: string[]; folder: string }[] = []
  await openFolder(input, where, (command, folder) => runs.push({ command, folder }))
  return runs
}

test('lists only the editors whose commands are found', () => {
  const linux = pc('linux', { zeditor: '/usr/bin/zeditor', 'xdg-open': '/usr/bin/xdg-open', konsole: '/usr/bin/konsole' })
  expect(detect(linux)).toEqual([
    { id: 'zed', label: 'Zed' },
    { id: 'files', label: 'File manager' },
    { id: 'terminal', label: 'Terminal' },
  ])

  const windows = pc('win32', { code: 'C:\\bin\\code.cmd', explorer: 'C:\\Windows\\explorer.exe', cmd: 'C:\\Windows\\cmd.exe' })
  expect(detect(windows).map(editor => editor.label)).toEqual(['VS Code', 'File Explorer', 'Terminal'])

  expect(detect(pc('darwin', {}))).toEqual([])
})

test('opens the folder as the working folder and never passes it on the command line', async () => {
  const folder = 'C:\\work\\a&b'
  const windows = pc('win32', { code: 'C:\\bin\\code.cmd', wt: 'C:\\apps\\wt.exe', cmd: 'C:\\Windows\\cmd.exe' }, [folder])
  expect(await opened(windows, { cwd: folder, editor: 'vscode' })).toEqual([{ command: ['C:\\bin\\code.cmd', '.'], folder }])
  expect(await opened(windows, { cwd: folder, editor: 'terminal' })).toEqual([{ command: ['C:\\apps\\wt.exe', '-d', '.'], folder }])

  const plain = pc('win32', { cmd: 'C:\\Windows\\cmd.exe' }, [folder])
  expect(await opened(plain, { cwd: folder, editor: 'terminal' })).toEqual([{ command: ['C:\\Windows\\cmd.exe', '/c', 'start', 'cmd'], folder }])
})

test('refuses anything but an existing full folder path and an installed editor', async () => {
  const windows = pc('win32', { code: 'C:\\bin\\code.cmd' }, ['C:\\work', '\\\\server\\share', 'work'])
  const linux = pc('linux', { code: '/usr/bin/code' }, ['/work', '-n'])
  const refused = [
    [windows, 'work', 'vscode'],
    [windows, '\\\\server\\share', 'vscode'],
    [windows, 'C:\\missing', 'vscode'],
    [windows, 'C:\\work', 'cursor'],
    [linux, '-n', 'vscode'],
    [linux, '/work', 'files'],
  ] as const
  for (const [where, cwd, editor] of refused) await expect(opened(where, { cwd, editor })).rejects.toThrow()

  expect(await opened(linux, { cwd: '/work', editor: 'vscode' })).toEqual([{ command: ['/usr/bin/code', '.'], folder: '/work' }])
  await expect(parseInput(editorOpen, { cwd: '/work', editor: 'sh -c reboot' })).rejects.toThrow()
})
