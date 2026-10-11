import { appendFile, chmod, mkdir, readFile, stat } from 'node:fs/promises'
import { homedir } from 'node:os'
import { basename, delimiter, join } from 'node:path'
import { buildBunFile, bunFolder } from '../bun/home'
import { appsFolder, currentFile } from '../layout'

const quote = (value: string) => `'${value.replaceAll("'", `'\\''`)}'`

const doubleQuoted = (value: string) => value.replace(/[\\$`"]/g, '\\$&')

const fishQuote = (value: string) => `'${value.replace(/[\\']/g, '\\$&')}'`

const posixShim = (home: string) =>
  [
    '#!/bin/sh',
    `apps=${quote(appsFolder(home))}`,
    `current=${quote(currentFile(home))}`,
    `buns=${quote(bunFolder(home))}`,
    'name=',
    '[ -f "$current" ] && { read -r name < "$current" || true; }',
    'case "$name" in',
    "  ''|*/*)",
    '    echo "sand is not installed in $apps" >&2',
    '    exit 1',
    '    ;;',
    'esac',
    'version=',
    `[ -f "$apps/$name/${buildBunFile}" ] && { read -r version < "$apps/$name/${buildBunFile}" || true; }`,
    'case "$version" in',
    "  ''|*[!0-9.]*) version= ;;",
    'esac',
    'bun="$buns/$version/bun"',
    'if [ -z "$version" ] || [ ! -x "$bun" ]; then',
    `  echo "sand's Bun is missing for build $name; run Repair from another PC" >&2`,
    '  exit 1',
    'fi',
    'exec "$bun" "$apps/$name/apps/sand/src/main.ts" "$@"',
    '',
  ].join('\n')

const exists = (path: string) => stat(path).then(() => true, () => false)

const appendLine = async (file: string, line: string, bin: string) => {
  const text = await readFile(file, 'utf8').catch(() => undefined)
  if (text?.includes(bin) || text?.includes(line)) return false
  const gap = text && !text.endsWith('\n') ? '\n' : ''
  await appendFile(file, `${gap}${line}\n`)
  return true
}

const macBashProfile = async (user: string) => {
  const own = join(user, '.bash_profile')
  if ((await exists(own)) || !(await exists(join(user, '.profile')))) return own
}

const shellProfile = async (user: string) => {
  const shell = basename(process.env.SHELL ?? '')
  if (shell === 'zsh') return join(user, '.zshrc')
  if (shell !== 'bash') return
  return process.platform === 'darwin' ? macBashProfile(user) : join(user, '.bashrc')
}

const profileTargets = async (user: string) => {
  const profiles = ['.bashrc', '.zshrc', '.profile'].map(name => join(user, name))
  const present = await Promise.all(profiles.map(exists))
  const found = profiles.filter((_, index) => present[index])
  const own = await shellProfile(user)
  const fallback = found.length ? [] : [join(user, '.profile')]
  return [...new Set([...found, ...(own ? [own] : fallback)])]
}

const addToShellProfiles = async (user: string, bin: string) => {
  const line = `export PATH="${doubleQuoted(bin)}:$PATH"`
  let changed = false
  for (const file of await profileTargets(user)) if (await appendLine(file, line, bin)) changed = true
  return changed
}

const addToFish = async (user: string, bin: string) => {
  const fish = join(user, '.config', 'fish')
  if (!(await exists(fish))) return false
  await mkdir(join(fish, 'conf.d'), { recursive: true })
  return appendLine(join(fish, 'conf.d', 'sand.fish'), `fish_add_path ${fishQuote(bin)}`, bin)
}

export const writePosixShim = async (home: string, bin: string) => {
  await mkdir(bin, { recursive: true })
  const shim = join(bin, 'sand')
  await Bun.write(shim, posixShim(home))
  await chmod(shim, 0o755)
}

export const posixPath = async (home: string, bin: string) => {
  await writePosixShim(home, bin)
  if ((process.env.PATH ?? '').split(delimiter).includes(bin)) return { bin, changed: false }
  const user = homedir()
  const shells = await addToShellProfiles(user, bin)
  const fish = await addToFish(user, bin)
  return { bin, changed: shells || fish, hint: 'Open a new terminal to use sand' }
}
