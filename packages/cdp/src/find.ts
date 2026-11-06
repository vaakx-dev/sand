import { join } from 'node:path'

const windows = () =>
  [process.env.ProgramFiles, process.env['ProgramFiles(x86)'], process.env.LOCALAPPDATA]
    .filter(root => root !== undefined)
    .flatMap(root => [
      join(root, 'Google', 'Chrome', 'Application', 'chrome.exe'),
      join(root, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
      join(root, 'Chromium', 'Application', 'chrome.exe'),
    ])

const mac = () => [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
]

const linux = () =>
  ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser', 'microsoft-edge'].flatMap(name => Bun.which(name) ?? [])

const installed: Partial<Record<NodeJS.Platform, () => string[]>> = { win32: windows, darwin: mac }

const search = async () => {
  const candidates = [process.env.CHROME_PATH, ...(installed[process.platform] ?? linux)()]
  for (const path of candidates) {
    if (path && (await Bun.file(path).exists())) return path
  }
  return undefined
}

let found: Promise<string | undefined> | undefined

export const findBrowser = () => (found ??= search())
