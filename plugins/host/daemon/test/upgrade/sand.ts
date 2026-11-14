import { readPointer, readServerInfo, shimFile } from '@sand/boot'
import { request, type } from '@sand/host-hub/contract'
import { copyFile, mkdir, mkdtemp, readdir, rm } from 'node:fs/promises'
import { realpathSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { z } from 'zod'
import { isAlive, running } from '../../src/control/info'
import { openLink } from '../../src/control/link'
import { type Build, repoRoot } from './builds'
import type { FakeGithub } from './github'

const windows = process.platform === 'win32'
const preload = join(import.meta.dir, 'preload.ts').replaceAll('\\', '/')

export interface Sand {
  home: string
  port: number
  log(): Promise<string>
}

export interface Install {
  output: string
  current?: string
}

const wire = <O>(id: string) => request(id, { input: () => z.unknown(), output: type<O>(), callers: 'any' })

const freePort = () => {
  const server = Bun.serve({ hostname: '127.0.0.1', port: 0, fetch: () => new Response() })
  const port = server.port ?? 0
  server.stop(true)
  return port
}

const ownEnv = () => Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith('SAND_') && key !== 'BUN_OPTIONS'))

const sandEnv = (sand: Sand, github: FakeGithub): Record<string, string | undefined> => ({
  ...ownEnv(),
  SAND_HOME: sand.home,
  SAND_TEST_GITHUB: github.url,
  BUN_OPTIONS: `--preload=${preload}`,
  BROWSER: 'none',
})

const execute = async (command: string[], env: Record<string, string | undefined>, timeout = 5 * 60_000) => {
  const proc = Bun.spawn(command, { cwd: repoRoot, env, stdin: 'ignore', stdout: 'pipe', stderr: 'pipe', windowsHide: true, timeout })
  const [out, err, code] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text(), proc.exited])
  return { code, output: `${out}${err}` }
}

export const makeSand = async (): Promise<Sand> => {
  const home = await mkdtemp(join(realpathSync.native(tmpdir()), 'sand-upgrade-'))
  const port = freePort()
  await Bun.write(join(home, 'sand.toml'), `[host]\nport = ${port}\n\n[plugins.devices-network]\nenabled = false\n`)
  return { home, port, log: () => Bun.file(join(home, 'server.log')).text().catch(() => '') }
}

const placeBun = async (sand: Sand, build: Build) => {
  if (build.bun !== Bun.version) return
  const folder = join(sand.home, 'bun', build.bun)
  await mkdir(folder, { recursive: true })
  for (let round = 1; ; round++) {
    try {
      return await copyFile(process.execPath, join(folder, windows ? 'bun.exe' : 'bun'))
    } catch (error) {
      if (round >= 10) throw error
      await Bun.sleep(1000)
    }
  }
}

const installCommand = () =>
  windows
    ? ['powershell.exe', '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', `iex (Get-Content -Raw -LiteralPath '${join(repoRoot, 'docs', 'install.ps1')}')`]
    : ['sh', join(repoRoot, 'docs', 'install.sh')]

export const install = async (sand: Sand, github: FakeGithub, tag: string, build: Build, extra: Record<string, string> = {}): Promise<Install> => {
  await placeBun(sand, build)
  const user = join(sand.home, 'user')
  await mkdir(user, { recursive: true })
  const env = { ...sandEnv(sand, github), SAND_RELEASE_URL: github.assets(tag), SAND_CHANNEL: 'dev', SAND_NO_START: '1', ...(!windows && { HOME: user }), ...extra }
  const { output } = await execute(installCommand(), env)
  return { output, current: await readPointer(sand.home, 'current') }
}

export const sand = (target: Sand, github: FakeGithub, ...args: string[]) =>
  execute(windows ? ['cmd.exe', '/d', '/c', shimFile(target.home), ...args] : [shimFile(target.home), ...args], sandEnv(target, github))

export const ask = async <O>(target: Sand, id: string, input: unknown = {}, timeout = 30_000): Promise<O> => {
  const info = await running(target.home)
  if (!info) throw new Error(`sand is not running in ${target.home}`)
  const link = await openLink(target.home, info.url)
  try {
    return await link.call(wire<O>(id), input, { timeout })
  } finally {
    link.close()
  }
}

export interface Health {
  runtime: string
  web: boolean
  failedPlugins: { id: string; error: string }[]
  error?: string
}

export const health = (target: Sand) => ask<Health>(target, 'host.health')

const settledHealth = async (target: Sand, until: number) => {
  let last: unknown
  while (Date.now() < until) {
    const report = await health(target).catch((error: unknown) => {
      last = error
      return undefined
    })
    if (report && report.runtime !== 'starting') return report
    if (report) last = report
    await Bun.sleep(500)
  }
  throw new Error(`sand in ${target.home} did not settle: ${JSON.stringify(last instanceof Error ? last.message : last)}`)
}

export const start = async (target: Sand, github: FakeGithub) => {
  const { code, output } = await sand(target, github, 'serve')
  if (code !== 0) throw new Error(`sand serve failed (exit code ${code}):\n${output}\n${await target.log()}`)
  return settledHealth(target, Date.now() + 90_000)
}

export interface UpdateState {
  channel: string
  current?: { id: string; time: number }
  latest?: { build: { id: string; time: number } }
  available: boolean
  phase: string
  error?: string
  checkError?: string
}

export interface Updated {
  state?: UpdateState
  health?: Health
  current?: string
}

export const update = async (target: Sand, build: Build, timeout = 6 * 60_000): Promise<Updated> => {
  const checked = await ask<UpdateState>(target, 'updates.check', {}, 60_000)
  if (checked.latest?.build.id !== build.id) throw new Error(`sand did not find build ${build.id}: ${JSON.stringify(checked)}`)
  const before = (await readServerInfo(target.home))?.pid
  await ask<UpdateState>(target, 'updates.apply', { build: build.id }, 60_000)
  const until = Date.now() + timeout
  while (Date.now() < until) {
    await Bun.sleep(1000)
    if (before && isAlive(before)) {
      if ((await readServerInfo(target.home))?.pid !== before) continue
      const state = await ask<UpdateState>(target, 'updates.state').catch(() => undefined)
      if (state?.phase === 'failed') return { state, current: await readPointer(target.home, 'current') }
      if (state?.phase === 'idle' && state.current?.id === build.id) break
      continue
    }
    if ((await processesIn(target.home)).some(found => /\shandoff\b/.test(found.command))) continue
    if (await running(target.home)) break
  }
  const report = await settledHealth(target, until).catch(() => undefined)
  const state = await ask<UpdateState>(target, 'updates.state').catch(() => undefined)
  return { state, health: report, current: await readPointer(target.home, 'current') }
}

const processesIn = async (home: string) => {
  const script = windows
    ? ['powershell.exe', '-NoProfile', '-NonInteractive', '-Command', `Get-CimInstance Win32_Process | Where-Object { $_.ProcessId -ne $PID -and $_.CommandLine } | ForEach-Object { "$($_.ProcessId) $($_.CommandLine)" }`]
    : ['ps', '-eo', 'pid=,args=']
  const { output } = await execute(script, process.env, 60_000)
  return output
    .split(/\r?\n/)
    .map(line => /^\s*(\d+)\s+(.*)$/.exec(line))
    .flatMap(match => (match ? [{ pid: Number(match[1]), command: match[2]! }] : []))
    .filter(found => found.command.includes(home) && found.pid !== process.pid && !found.command.includes('Win32_Process'))
}

const dropFromUserPath = (bin: string) =>
  execute(
    [
      'powershell.exe',
      '-NoProfile',
      '-NonInteractive',
      '-Command',
      [
        "$key = [Microsoft.Win32.Registry]::CurrentUser.OpenSubKey('Environment', $true)",
        "$old = [string]$key.GetValue('Path', '', [Microsoft.Win32.RegistryValueOptions]::DoNotExpandEnvironmentNames)",
        `$kept = @($old -split ';' | Where-Object { $_ -and $_.TrimEnd('\\') -ne '${bin}' })`,
        "if ($kept.Count -ne @($old -split ';' | Where-Object { $_ }).Count) { $key.SetValue('Path', ($kept -join ';'), [Microsoft.Win32.RegistryValueKind]::ExpandString) }",
        '$key.Close()',
      ].join('\n'),
    ],
    process.env,
    60_000,
  )

export const stop = async (target: Sand, github: FakeGithub) => {
  await sand(target, github, 'stop').catch(() => {})
  for (let round = 0; round < 3; round++) {
    const pids = (await processesIn(target.home)).map(found => found.pid)
    if (!pids.length) return
    for (const pid of pids) {
      try {
        process.kill(pid, 'SIGKILL')
      } catch {}
    }
    await Bun.sleep(500)
  }
}

export const remove = async (target: Sand, github: FakeGithub) => {
  await stop(target, github)
  if (windows) await dropFromUserPath(join(target.home, 'bin'))
  for (let round = 0; round < 10; round++) {
    try {
      await rm(target.home, { recursive: true, force: true })
      return
    } catch {
      await Bun.sleep(1000)
    }
  }
}

export const damagedCopies = async (home: string, name: string) => (await readdir(home)).filter(entry => entry.startsWith(`${name}.damaged-`))
