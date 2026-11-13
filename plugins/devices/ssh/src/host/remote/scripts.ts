import type { InstallPlatform } from '@sand/devices-contract'

export interface RemoteCommand {
  command: string
  stdin?: string
}

type Shell = 'posix' | 'windows'

export const markers = { missing: 'sand:missing', server: 'sand:server ', done: 'sand:done ' } as const

const posixQuoted = (value: string) => `'${value.replaceAll("'", `'\\''`)}'`

const powershellQuoted = (value: string) => `'${value.replaceAll("'", "''")}'`

const encoded = (script: string) => Buffer.from(script, 'utf16le').toString('base64')

const shells: Record<Shell, (script: string) => RemoteCommand> = {
  posix: script => ({ command: 'sh -s', stdin: script }),
  windows: script => ({
    command: `powershell -NoProfile -NonInteractive -ExecutionPolicy Bypass -OutputFormat Text -EncodedCommand ${encoded(script)}`,
  }),
}

const posixShim = '"$HOME/.sand/bin/sand"'

const windowsPrelude = [
  "$ErrorActionPreference = 'Stop'",
  "$ProgressPreference = 'SilentlyContinue'",
  "$sand = Join-Path $env:USERPROFILE '.sand'",
  "$shim = Join-Path $sand 'bin\\sand.cmd'",
]

const ensureScripts: Record<Shell, string> = {
  posix: [
    `if [ ! -x ${posixShim} ]; then echo '${markers.missing}'; exit 0; fi`,
    `${posixShim} serve </dev/null >/dev/null || exit $?`,
    `printf '%s' '${markers.server}'`,
    `tr -d '\\r\\n' < "$HOME/.sand/server.json"`,
    'echo',
    '',
  ].join('\n'),
  windows: [
    ...windowsPrelude,
    `if (-not (Test-Path -LiteralPath $shim)) { '${markers.missing}'; exit 0 }`,
    "$info = Join-Path $sand 'server.json'",
    "$log = Join-Path $sand 'serve.log'",
    `$line = 'cmd.exe /d /c ""' + $shim + '" serve > nul 2> "' + $log + '""'`,
    '$started = Invoke-CimMethod -ClassName Win32_Process -MethodName Create -Arguments @{ CommandLine = $line; CurrentDirectory = $env:USERPROFILE }',
    'if ($started.ReturnValue -ne 0) { throw "Windows would not start sand (Win32_Process.Create returned $($started.ReturnValue))" }',
    '$serve = Get-Process -Id $started.ProcessId -ErrorAction SilentlyContinue',
    'if ($serve -and -not $serve.WaitForExit(90000)) { throw "sand did not start in time; see $log" }',
    '$server = if (Test-Path -LiteralPath $info) { Get-Content -LiteralPath $info -Raw | ConvertFrom-Json }',
    'if (-not ($server -and (Get-Process -Id $server.pid -ErrorAction SilentlyContinue))) { throw "sand did not start; see $log" }',
    `'${markers.server}' + ($server | ConvertTo-Json -Compress)`,
  ].join('\n'),
}

const installScripts = (command: string): Record<Shell, string> => ({
  posix: [command, 'code=$?', `printf '\\n%s%s\\n' '${markers.done}' "$code"`, 'exit $code', ''].join('\n'),
  windows: ["$ProgressPreference = 'SilentlyContinue'", command, '$code = [int](-not $?)', `'${markers.done}' + $code`, 'exit $code'].join('\n'),
})

const joinScripts = (link: string): Record<Shell, string> => ({
  posix: `${posixShim} devices join ${posixQuoted(link)} </dev/null\n`,
  windows: [...windowsPrelude, `& $shim devices join ${powershellQuoted(link)}`, 'exit $LASTEXITCODE'].join('\n'),
})

const remote = (platform: InstallPlatform, scripts: Record<Shell, string>) => {
  const shell: Shell = platform === 'win32' ? 'windows' : 'posix'
  return shells[shell](scripts[shell])
}

export const unameCommand: RemoteCommand = { command: 'uname -sm' }

export const ensureCommand = (platform: InstallPlatform) => remote(platform, ensureScripts)

export const installCommand = (platform: InstallPlatform, command: string) => remote(platform, installScripts(command))

export const joinCommand = (platform: InstallPlatform, link: string) => remote(platform, joinScripts(link))
