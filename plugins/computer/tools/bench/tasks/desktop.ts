import { mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { powershell } from '../powershell'
import { all, answered, onScreen, type Seen, type Task, type Verdict } from './task'
import { digits, pick, shuffled } from './local/layout'

const steam = ['steam', 'steamwebhelper']
const settingsApp = ['systemsettings', 'applicationframehost']
const explorer = ['explorer']

const windowsBuild = async (seen: Seen): Promise<Verdict> => {
  const [version = '', build = ''] = (
    await powershell("$v = Get-ItemProperty 'HKLM:\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion'; \"$($v.DisplayVersion) $($v.CurrentBuild).$($v.UBR)\"")
  ).split(' ')
  return all(answered(seen, version), answered(seen, build))
}

const vlcVersion = async (seen: Seen): Promise<Verdict> => {
  const version = await powershell(
    "(Get-ItemProperty 'HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*', 'HKLM:\\SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*' | Where-Object DisplayName -eq 'VLC media player' | Select-Object -First 1).DisplayVersion",
  )
  return version ? answered(seen, version) : { pass: false, why: 'VLC media player is not installed on this PC' }
}

const displayMode = async (seen: Seen): Promise<Verdict> => {
  const [width = '', height = '', hertz = ''] = (
    await powershell('$c = Get-CimInstance Win32_VideoController | Where-Object CurrentHorizontalResolution | Select-Object -First 1; "$($c.CurrentHorizontalResolution) $($c.CurrentVerticalResolution) $($c.CurrentRefreshRate)"')
  ).split(' ')
  return all(answered(seen, `${width}×${height}`, `${width}x${height}`), answered(seen, `${hertz}Hz`, `${hertz}.00Hz`))
}

const kilobyte = 1024

const archive = join(tmpdir(), 'sand-bench-archive')

const archiveFiles = shuffled(['2022', '2023', join('2023', 'scans'), '2024'].flatMap(folder => ['invoice', 'receipt', 'statement', 'contract', 'quote'].map(stem => ({ folder, name: `${stem}-${digits(4)}.pdf` }))))
  .map((file, index) => ({ ...file, bytes: (40 + index * 9 + Math.floor(Math.random() * 6)) * kilobyte }))
  .sort((a, b) => a.folder.localeCompare(b.folder))

const largest = archiveFiles.reduce((most, file) => (file.bytes > most.bytes ? file : most))

const writeArchive = async () => {
  for (const { folder, name, bytes } of archiveFiles) {
    mkdirSync(join(archive, folder), { recursive: true })
    writeFileSync(join(archive, folder, name), new Uint8Array(bytes).fill(32))
  }
  return async () => rmSync(archive, { recursive: true, force: true })
}

const reports = join(tmpdir(), 'sand-bench-reports')

const reportNames = ['quarterly-report', 'budget-draft', 'meeting-notes', 'roadmap', 'hiring-plan', 'press-release'].map(stem => `${stem}-${digits(2)}.docx`)

const target = pick(reportNames)

const dayIn = (year: number) => new Date(year, 2 + Math.floor(Math.random() * 7), 13 + Math.floor(Math.random() * 16), 9 + Math.floor(Math.random() * 8), Math.floor(Math.random() * 60))

const created = dayIn(2019)

const iso = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}T${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:00`

const writeReports = async () => {
  mkdirSync(reports, { recursive: true })
  const stamps = reportNames.map(name => ({ path: join(reports, name), created: name === target ? created : dayIn(2020), modified: dayIn(2022) }))
  for (const { path } of stamps) writeFileSync(path, 'draft')
  await powershell(stamps.map(stamp => `$f = Get-Item '${stamp.path}'; $f.CreationTime = '${iso(stamp.created)}'; $f.LastWriteTime = '${iso(stamp.modified)}'`).join('; '))
  return async () => rmSync(reports, { recursive: true, force: true })
}

const month = (date: Date) => date.toLocaleString('en-US', { month: 'long' })

const createdDates = (date: Date) => {
  const [day, number, year] = [date.getDate(), date.getMonth() + 1, date.getFullYear()]
  return [`${number}/${day}/${year}`, `${month(date)} ${day} ${year}`, `${day} ${month(date)} ${year}`, `${day}/${number}/${year}`, iso(date).slice(0, 10)]
}

const activeAdapter = async (seen: Seen): Promise<Verdict> => {
  const mac = await powershell("(Get-NetAdapter -Physical | Where-Object Status -eq 'Up' | Select-Object -First 1).MacAddress")
  return mac ? answered(seen, mac, mac.replaceAll('-', ':')) : { pass: false, why: 'no network adapter is connected' }
}

const drafts = join(tmpdir(), 'sand-bench-drafts')

const draftNames = ['budget', 'roadmap', 'press-release', 'offer-letter', 'brief'].map(stem => `${stem}-draft-${digits(2)}.docx`)

const otherNames = ['budget', 'roadmap', 'press-release', 'offer-letter', 'brief', 'invoice', 'contract', 'minutes', 'agenda', 'report'].flatMap(stem => [
  `${stem}-final-${digits(2)}.docx`,
  `${stem}-${digits(4)}.pdf`,
])

const writeDrafts = async () => {
  mkdirSync(join(drafts, 'old'), { recursive: true })
  for (const name of [...draftNames, ...otherNames]) writeFileSync(join(drafts, name), 'text')
  return async () => rmSync(drafts, { recursive: true, force: true })
}

const sameNames = (found: string[], wanted: string[]) => found.toSorted().join('|') === wanted.toSorted().join('|')

const draftsMoved = (): Verdict => {
  const moved = readdirSync(join(drafts, 'old'))
  const left = readdirSync(drafts).filter(name => name !== 'old')
  return sameNames(moved, draftNames) && sameNames(left, otherNames)
    ? { pass: true, why: 'moved exactly the drafts' }
    : { pass: false, why: `old holds ${moved.join(', ') || 'nothing'}; ${left.length} files left in the folder` }
}

export const desktop: Task[] = [
  {
    id: 'steam-game',
    set: 'desktop',
    place: 'app',
    kind: 'app',
    apps: steam,
    prompt: () => 'Open the Steam app (not a web browser) and find the store page of the game Portal 2. If Steam asks who is playing, pick the profile that is already there. Do not buy, install or add anything.',
    check: seen => seen.judge('The Steam desktop app, not a web browser, shows the store page of the game Portal 2.'),
  },
  {
    id: 'calculator',
    set: 'desktop',
    place: 'app',
    kind: 'app',
    apps: ['applicationframehost', 'calculatorapp'],
    prompt: () => 'Open the Windows Calculator app and use it to work out 1234 × 56, so the result shows in Calculator.',
    check: seen => onScreen(seen, 'Display is 69,104', 'Display is 69104'),
  },
  {
    id: 'explorer-folder',
    set: 'desktop',
    place: 'app',
    kind: 'app',
    apps: explorer,
    prompt: () => 'Open File Explorer and show the contents of the folder C:\\Windows\\System32\\drivers\\etc. Do not open, move or change any file.',
    check: seen => all(onScreen(seen, 'hosts'), onScreen(seen, 'networks')),
  },
  {
    id: 'settings-about',
    set: 'desktop',
    place: 'app',
    kind: 'app',
    apps: settingsApp,
    prompt: () => 'Open Windows Settings and go to the System > About page. Do not change anything.',
    check: seen => seen.judge('Windows Settings is open on the System > About page, which lists the device name and its specifications.'),
  },
  {
    id: 'steam-fact',
    set: 'desktop',
    place: 'app',
    kind: 'app',
    apps: steam,
    prompt: () =>
      'In the Steam app (not a web browser), find the store page of the game Hollow Knight (the first game, not Silksong). If Steam asks who is playing, pick the profile that is already there. Reply with its developer and its release date exactly as the store page shows them. Do not buy, install, wishlist or follow anything.',
    check: async seen => all(answered(seen, 'Team Cherry'), answered(seen, 'Feb'), answered(seen, '2017'), await seen.judge('The Steam desktop app, not a web browser, shows the store page of Hollow Knight (not Hollow Knight: Silksong).')),
  },
  {
    id: 'settings-build',
    set: 'desktop',
    place: 'app',
    kind: 'app',
    apps: settingsApp,
    prompt: () => 'Using Windows Settings, find which Windows version (such as 23H2) and which OS build this PC runs. Reply with both. Do not use a terminal or a browser, and do not change anything.',
    check: windowsBuild,
  },
  {
    id: 'settings-display',
    set: 'desktop',
    place: 'app',
    kind: 'app',
    apps: settingsApp,
    prompt: () => "Using Windows Settings, find the main display's resolution and its refresh rate in Hz. Reply with both. Do not change any display setting.",
    check: displayMode,
  },
  {
    id: 'settings-app-version',
    set: 'desktop',
    place: 'app',
    kind: 'app',
    apps: settingsApp,
    prompt: () => 'Using Windows Settings, find the version number of VLC media player installed on this PC. Reply with it. Do not open VLC, a browser or a terminal, and do not uninstall or change anything.',
    check: vlcVersion,
  },
  {
    id: 'explorer-largest',
    set: 'desktop',
    place: 'app',
    kind: 'app',
    apps: explorer,
    prepare: writeArchive,
    prompt: () => `In File Explorer, open the folder ${archive}. Find the largest file anywhere inside it, including in its subfolders, and reply with its file name. Do not open, move or change any file.`,
    check: seen => answered(seen, largest.name),
  },
  {
    id: 'explorer-created',
    set: 'desktop',
    place: 'app',
    kind: 'menu',
    apps: explorer,
    prepare: writeReports,
    prompt: () => `In File Explorer, open the folder ${reports}, open the Properties of the file ${target}, and reply with the date it was created, as its Properties show it. Do not open, move or change any file.`,
    check: seen => answered(seen, ...createdDates(created)),
  },
  {
    id: 'explorer-move',
    set: 'desktop',
    place: 'app',
    kind: 'gesture',
    apps: explorer,
    prepare: writeDrafts,
    prompt: () =>
      `In File Explorer, open the folder ${drafts}. Move every file whose name contains the word "draft" into its subfolder named "old", and leave every other file where it is. Do not delete, rename or open any file.`,
    check: draftsMoved,
  },
  {
    id: 'steam-requirements',
    set: 'desktop',
    place: 'app',
    kind: 'scroll',
    apps: steam,
    prompt: () =>
      "In the Steam app (not a web browser), open the store page of Hollow Knight (not Silksong) and find its minimum system requirements for Windows. Reply with the minimum processor and graphics card it lists. If Steam asks who is playing, pick the profile that is already there. Do not buy, install, wishlist or follow anything.",
    check: async seen =>
      all(answered(seen, 'E5200'), answered(seen, '9800'), await seen.judge("The Steam app, not a web browser, shows Hollow Knight's system requirements section.")),
  },
  {
    id: 'settings-mac',
    set: 'desktop',
    place: 'app',
    kind: 'app',
    apps: settingsApp,
    prompt: () =>
      'Using Windows Settings, find the physical (MAC) address of the network adapter this PC is connected to the internet through right now. Reply with it. Do not use a terminal or a browser, and do not change any setting.',
    check: activeAdapter,
  },
]
