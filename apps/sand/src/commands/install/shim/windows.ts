import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { buildBunFile, bunFolder } from '../../../host/dist/bun/home'
import { appsFolder, currentFile } from '../../../host/dist/layout'

const batchText = (value: string) => value.replaceAll('%', '%%')

export const windowsShim = ({ home }: { home: string }) => {
  const apps = batchText(appsFolder(home))
  const current = batchText(currentFile(home))
  const bun = `${batchText(bunFolder(home))}\\%SAND_BUN%\\bun.exe`
  const version = `${apps}\\%SAND_APP%\\${buildBunFile}`
  return [
    '@echo off',
    'setlocal',
    'set "SAND_APP="',
    'set "SAND_BUN="',
    `if not exist "${current}" goto missing`,
    `set /p SAND_APP=<"${current}"`,
    'if not defined SAND_APP goto missing',
    `if not exist "${version}" goto nobun`,
    `set /p SAND_BUN=<"${version}"`,
    'if not defined SAND_BUN goto nobun',
    `if not exist "${bun}" goto nobun`,
    `"${bun}" "${apps}\\%SAND_APP%\\apps\\sand\\src\\main.ts" %*`,
    'exit /b %errorlevel%',
    ':missing',
    `echo sand is not installed in "${apps}" 1>&2`,
    'exit /b 1',
    ':nobun',
    "echo sand's Bun is missing for build %SAND_APP%; run Repair from another PC 1>&2",
    'exit /b 1',
    '',
  ].join('\r\n')
}

const addToUserPath = [
  "$key = [Microsoft.Win32.Registry]::CurrentUser.OpenSubKey('Environment', $true)",
  "$old = [string]$key.GetValue('Path', '', [Microsoft.Win32.RegistryValueOptions]::DoNotExpandEnvironmentNames)",
  "$parts = @($old -split ';' | Where-Object { $_ })",
  "if (@($parts | ForEach-Object { $_.TrimEnd('\\') }) -contains $env:SAND_BIN.TrimEnd('\\')) { $key.Close(); 'same'; return }",
  "$key.SetValue('Path', ((@($parts) + $env:SAND_BIN) -join ';'), [Microsoft.Win32.RegistryValueKind]::ExpandString)",
  '$key.Close()',
  "[Environment]::SetEnvironmentVariable('SAND_PATH_REFRESH', $null, 'User')",
  "'added'",
].join('\n')

const updateUserPath = async (bin: string) => {
  const child = Bun.spawn(['powershell', '-NoProfile', '-NonInteractive', '-Command', addToUserPath], {
    env: { ...process.env, SAND_BIN: bin },
    stdin: 'ignore',
    stdout: 'pipe',
    stderr: 'pipe',
    windowsHide: true,
  })
  const [out, code] = await Promise.all([new Response(child.stdout).text(), child.exited])
  if (code !== 0) return
  return out.trim()
}

const pathKey = () => Object.keys(process.env).find(key => key.toUpperCase() === 'PATH') ?? 'Path'

const inProcessPath = (bin: string) => {
  const key = pathKey()
  const parts = (process.env[key] ?? '').split(';').filter(Boolean)
  const same = (part: string) => part.replace(/\\+$/, '').toLowerCase() === bin.replace(/\\+$/, '').toLowerCase()
  if (parts.some(same)) return true
  process.env[key] = [...parts, bin].join(';')
  return false
}

export const writeWindowsShim = async (home: string, bin: string) => {
  await mkdir(bin, { recursive: true })
  await Bun.write(join(bin, 'sand.cmd'), windowsShim({ home }))
}

export const windowsPath = async ({ home, bin }: { home: string; bin: string }) => {
  await writeWindowsShim(home, bin)
  const known = inProcessPath(bin)
  const result = await updateUserPath(bin).catch(() => undefined)
  if (result !== 'added' && result !== 'same') return { bin, changed: false, hint: `Add ${bin} to your PATH to use sand` }
  if (known) return { bin, changed: result === 'added' }
  return { bin, changed: result === 'added', hint: 'Open a new PowerShell window to use sand' }
}
