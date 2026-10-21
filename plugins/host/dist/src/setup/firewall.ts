import { dim, done, notice } from './print'

const ruleName = 'sand (Bun)'

const encoded = (script: string) => Buffer.from(script, 'utf16le').toString('base64')

const quote = (value: string) => `'${value.replaceAll("'", "''")}'`

const powershell = async (script: string) => {
  const child = Bun.spawn(
    ['powershell.exe', '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-EncodedCommand', encoded(script)],
    { stdin: 'ignore', stdout: 'ignore', stderr: 'ignore', windowsHide: true },
  )
  return (await child.exited) === 0
}

const hasRule = (program: string) =>
  powershell(`$rules = Get-NetFirewallApplicationFilter -Program ${quote(program)} -ErrorAction SilentlyContinue |
  Get-NetFirewallRule -ErrorAction SilentlyContinue |
  Where-Object { $_.Direction -eq 'Inbound' -and $_.Action -eq 'Allow' -and $_.Enabled -eq 'True' }
if ($rules) { exit 0 } else { exit 1 }`)

const addRule = (program: string) => {
  const elevated = `Remove-NetFirewallRule -DisplayName ${quote(ruleName)} -ErrorAction SilentlyContinue
$ErrorActionPreference = 'Stop'
New-NetFirewallRule -DisplayName ${quote(ruleName)} -Direction Inbound -Program ${quote(program)} -Action Allow -Profile Private,Domain | Out-Null`
  return powershell(`$ErrorActionPreference = 'Stop'
$process = Start-Process -FilePath powershell.exe -Verb RunAs -Wait -PassThru -WindowStyle Hidden -ArgumentList '-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-EncodedCommand','${encoded(elevated)}'
exit $process.ExitCode`)
}

export const firewallHint =
  'Windows Firewall may be blocking sand: set this network to Private in Windows settings, allow Bun when Windows asks, then run the command again'

export const allowThroughFirewall = async (program: string) => {
  if (process.platform !== 'win32') return
  if (await hasRule(program)) return
  notice('Allowing sand through Windows Firewall on private networks; Windows will ask for permission')
  if (await addRule(program)) done('Windows Firewall allows sand on private networks')
  else dim('Windows Firewall was not changed; if Windows asks when sand starts, allow Bun on private networks')
}
