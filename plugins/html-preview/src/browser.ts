import { existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

const commands = [
  'google-chrome-stable',
  'google-chrome',
  'chromium',
  'chromium-browser',
  'microsoft-edge-stable',
  'microsoft-edge',
  'brave-browser',
  'chrome',
]

const programFiles = [process.env.PROGRAMFILES, process.env['PROGRAMFILES(X86)'], process.env.LOCALAPPDATA].filter(Boolean) as string[]

const installed = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
  ...programFiles.flatMap(root => [join(root, 'Google', 'Chrome', 'Application', 'chrome.exe'), join(root, 'Microsoft', 'Edge', 'Application', 'msedge.exe')]),
]

const playwrightCaches = [
  join(homedir(), '.cache', 'ms-playwright'),
  join(homedir(), 'Library', 'Caches', 'ms-playwright'),
  ...(process.env.LOCALAPPDATA ? [join(process.env.LOCALAPPDATA, 'ms-playwright')] : []),
]

const playwrightBuilds = [
  'chromium-*/chrome-linux64/chrome',
  'chromium-*/chrome-linux/chrome',
  'chromium-*/chrome-mac*/Chromium.app/Contents/MacOS/Chromium',
  'chromium-*/chrome-win*/chrome.exe',
].map(pattern => new Bun.Glob(pattern))

const fromPlaywright = () =>
  playwrightCaches
    .filter(root => existsSync(root))
    .flatMap(root => playwrightBuilds.flatMap(glob => [...glob.scanSync({ cwd: root, onlyFiles: true })]).sort().reverse().map(path => join(root, path)))

export const findBrowser = (configured?: string) => {
  if (configured) return existsSync(configured) ? configured : Bun.which(configured) ?? undefined
  return commands.map(name => Bun.which(name)).find(Boolean) ?? installed.find(path => existsSync(path)) ?? fromPlaywright()[0]
}
