import type { GitRunner } from '@sand/git-runner/contract'
import { existsSync } from 'node:fs'
import { join, posix } from 'node:path'
import { z } from 'zod'

export interface Command {
  command: string
  why: string
}

export interface Facts {
  files: string[]
  commands: Command[]
}

const installs: Record<string, string> = {
  'bun.lock': 'bun install',
  'bun.lockb': 'bun install',
  'package-lock.json': 'npm ci',
  'npm-shrinkwrap.json': 'npm ci',
  'pnpm-lock.yaml': 'pnpm install',
  'yarn.lock': 'yarn install',
  'uv.lock': 'uv sync',
  'poetry.lock': 'poetry install',
  'Pipfile.lock': 'pipenv install',
  'Gemfile.lock': 'bundle install',
  'composer.lock': 'composer install',
  'go.sum': 'go mod download',
  'Cargo.lock': 'cargo fetch',
  'mix.lock': 'mix deps.get',
  'pubspec.lock': 'dart pub get',
}

const managers: Record<string, string> = { bun: 'bun install', npm: 'npm install', pnpm: 'pnpm install', yarn: 'yarn install' }

const mostFolders = 2
const mostListed = 5000
const mostFiles = 30
const envLike = /^\.env(\..+)?$|\.env$|^\.envrc$|^\.dev\.vars$|(^|\.)local(\.[^.]+)?$|^local\.settings\.json$|^secrets?\.(json|ya?ml|toml)$/i
const sample = /example|sample|template/i
const dependencies = /(^|\/)(node_modules|vendor|\.venv|target)\//
const plainPaths = ['-c', 'core.quotePath=false', 'ls-files']

const depth = (path: string) => path.split('/').length - 1

const runIn = (folder: string, command: string) => (folder === '.' ? command : `cd "${folder}" && ${command}`)

const lockCommands = async (git: GitRunner, main: string): Promise<Command[]> => {
  const specs = Object.keys(installs).map(name => `:(glob)**/${name}`)
  const { lines } = await git.lines(main, [...plainPaths, '--', ...specs], mostListed)
  return lines.flatMap(path => {
    const install = installs[posix.basename(path)]
    if (!install || depth(path) > mostFolders || dependencies.test(path)) return []
    return [{ command: runIn(posix.dirname(path), install), why: `${path} is tracked` }]
  })
}

const manifest = z.object({ packageManager: z.string() })

const managerCommand = async (main: string): Promise<Command[]> => {
  const file = Bun.file(join(main, 'package.json'))
  if (!(await file.exists())) return []
  const found = manifest.safeParse(await file.json())
  if (!found.success) return []
  const { packageManager } = found.data
  const command = managers[packageManager.split('@')[0] ?? '']
  return command ? [{ command, why: `package.json sets packageManager to ${packageManager}` }] : []
}

const submodules = (main: string): Command[] =>
  existsSync(join(main, '.gitmodules')) ? [{ command: 'git submodule update --init --recursive', why: '.gitmodules lists submodules' }] : []

const isLocalFile = (path: string) => {
  const name = posix.basename(path)
  return !path.endsWith('/') && !path.startsWith('"') && !dependencies.test(path) && envLike.test(name) && !sample.test(name)
}

const untracked = ['--others', '--exclude-standard', '--directory']

const localFiles = async (git: GitRunner, main: string) => {
  const listed = await Promise.all([[], ['--ignored']].map(flags => git.lines(main, [...plainPaths, ...untracked, ...flags], mostListed)))
  return listed
    .flatMap(({ lines }) => lines)
    .filter(isLocalFile)
    .slice(0, mostFiles)
}

const unique = (commands: Command[]) => commands.filter((command, index) => commands.findIndex(other => other.command === command.command) === index)

export const gatherFacts = async (git: GitRunner, main: string): Promise<Facts> => {
  const [locks, manager, files] = await Promise.all([lockCommands(git, main), managerCommand(main), localFiles(git, main)])
  return { files, commands: unique([...locks, ...manager, ...submodules(main)]) }
}
