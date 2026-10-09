import { hostPaths } from '@sand/kit'
import type { InstallScript, ScriptOptions } from './options'

const printable = (code: number) => code >= 0x20 && code <= 0x7e

const charCode = (code: number) => `[char]0x${code.toString(16).toUpperCase().padStart(4, '0')}`

const quote = (value: string) => {
  const parts: string[] = []
  let chunk = ''
  for (let index = 0; index < value.length; index++) {
    const code = value.charCodeAt(index)
    if (printable(code)) {
      chunk += value[index] === "'" ? "''" : value[index]
      continue
    }
    if (chunk) parts.push(`'${chunk}'`)
    chunk = ''
    parts.push(charCode(code))
  }
  if (chunk || !parts.length) parts.push(`'${chunk}'`)
  const [first] = parts
  if (parts.length === 1 && first?.startsWith("'")) return first
  return `('' + ${parts.join(' + ')})`
}

const unpack = 'await new Bun.Archive(await Bun.file(process.env.SAND_BUNDLE).bytes()).extract(process.env.SAND_DIR)'

const helpers = String.raw`
  function Write-Done {
    param([string]$Text, [string]$Detail)
    Write-Host $ok -ForegroundColor Green -NoNewline
    if ($Detail) {
      Write-Host (' ' + $Text + '  ') -NoNewline
      Write-Host ($arrow + ' ' + $Detail) -ForegroundColor DarkGray
    } else {
      Write-Host (' ' + $Text)
    }
  }

  function Invoke-Quiet {
    param([string]$Label, [string]$Command, [string[]]$Arguments)
    $ErrorActionPreference = 'Continue'
    $global:LASTEXITCODE = 1
    $output = & $Command @Arguments 2>&1 | ForEach-Object { [string]$_ }
    $code = $LASTEXITCODE
    if ($code -ne 0) {
      $tail = ($output | Select-Object -Last 20) -join [Environment]::NewLine
      throw ($Label + ' failed (code ' + $code + ')' + [Environment]::NewLine + $tail)
    }
  }

  function Send-Failure {
    param([string]$Text)
    try {
      if ($Text.Length -gt 16000) { $Text = $Text.Substring(0, 16000) }
      $body = [Text.Encoding]::UTF8.GetBytes($Text)
      Invoke-WebRequest -UseBasicParsing -Method Post -ContentType 'text/plain; charset=utf-8' -Body $body -TimeoutSec 10 -Uri ($base + ${quote(hostPaths.installFail)} + '?k=' + $key) | Out-Null
    } catch { }
  }

  function Get-BunVersion {
    param([string]$Exe)
    if (-not (Test-Path -LiteralPath $Exe)) { return '' }
    $ErrorActionPreference = 'Continue'
    try {
      return ([string](& $Exe --version 2>$null | Select-Object -First 1)).Trim()
    } catch {
      return ''
    }
  }

  function Get-BunTargets {
    $arch = $env:PROCESSOR_ARCHITEW6432
    if (-not $arch) { $arch = $env:PROCESSOR_ARCHITECTURE }
    if ($arch -eq 'ARM64') { return @('windows-aarch64', 'windows-x64-baseline') }
    if ($arch -ne 'AMD64') { throw ('Sand can''t run on this processor (' + $arch + '). Bun supports x64 and arm64.') }
    $avx2 = $false
    try {
      if (-not ('SandInstall.Cpu' -as [type])) {
        Add-Type -Name 'Cpu' -Namespace 'SandInstall' -MemberDefinition '[DllImport("kernel32.dll")] public static extern bool IsProcessorFeaturePresent(int ProcessorFeature);'
      }
      $avx2 = ('SandInstall.Cpu' -as [type])::IsProcessorFeaturePresent(40)
    } catch { }
    if ($avx2) { return @('windows-x64', 'windows-x64-baseline') }
    return @('windows-x64-baseline')
  }

  function Get-Bun {
    param([string]$Target, [string]$File)
    $uri = $base + ${quote(hostPaths.bun)} + '?k=' + $key + '&target=' + [uri]::EscapeDataString($Target)
    try {
      return Invoke-WebRequest -UseBasicParsing -Uri $uri -OutFile $File -PassThru
    } catch {
      $failure = $_
      $status = 0
      try { $status = [int]$failure.Exception.Response.StatusCode } catch { }
      if ($status -eq 404) { return $null }
      $reason = $failure.Exception.Message
      if ($failure.ErrorDetails -and $failure.ErrorDetails.Message) { $reason = $failure.ErrorDetails.Message }
      throw ('Could not download Bun from ' + $from + ': ' + $reason)
    }
  }

  function Expand-Gzip {
    param([string]$Source, [string]$Destination)
    $reader = [IO.File]::OpenRead($Source)
    try {
      $gzip = New-Object IO.Compression.GZipStream -ArgumentList $reader, ([IO.Compression.CompressionMode]::Decompress)
      $writer = [IO.File]::Create($Destination)
      try {
        $gzip.CopyTo($writer)
      } finally {
        $writer.Dispose()
        $gzip.Dispose()
      }
    } finally {
      $reader.Dispose()
    }
  }
`

const getBun = String.raw`    $targets = @(Get-BunTargets)
    $bunDir = Join-Path $sandHome ('bun\' + $bunVersion)
    $bun = Join-Path $bunDir 'bun.exe'
    if ((Get-BunVersion $bun) -eq $bunVersion) {
      Write-Done ('Bun ' + $bunVersion + ' ready')
    } else {
      New-Item -ItemType Directory -Force -Path $bunDir | Out-Null
      $gz = Join-Path ([IO.Path]::GetTempPath()) ('sand-bun-' + [guid]::NewGuid().ToString('N') + '.gz')
      $bunTemp = Join-Path $bunDir ('bun.tmp-' + [guid]::NewGuid().ToString('N') + '.exe')
      try {
        $found = $null
        $response = $null
        foreach ($target in $targets) {
          $response = Get-Bun $target $gz
          if ($response) {
            $found = $target
            break
          }
        }
        if (-not $found) { throw ($from + ' has no Bun ' + $bunVersion + ' build for this PC (tried ' + ($targets -join ', ') + ')') }
        $damaged = 'The Bun download from ' + $from + ' is damaged; run the command again'
        try { Expand-Gzip $gz $bunTemp } catch { throw $damaged }
        $want = [string]($response.Headers['x-sand-bun-sha256'] | Select-Object -First 1)
        if ((Get-FileHash -Algorithm SHA256 -LiteralPath $bunTemp).Hash -ne $want.Trim()) { throw $damaged }
        if ((Get-BunVersion $bunTemp) -ne $bunVersion) { throw ('The Bun ' + $bunVersion + ' from ' + $from + ' does not run on this PC (' + $found + ')') }
        Move-Item -LiteralPath $bunTemp -Destination $bun -Force
        [IO.File]::WriteAllText((Join-Path $sandHome 'bun\target'), $found)
        Write-Done ('Bun ' + $bunVersion + ' from ' + $from)
      } finally {
        Remove-Item -LiteralPath $gz -Force -ErrorAction SilentlyContinue
        Remove-Item -LiteralPath $bunTemp -Force -ErrorAction SilentlyContinue
      }
    }
`

const download = String.raw`
    $file = Join-Path ([IO.Path]::GetTempPath()) ('sand-' + [guid]::NewGuid().ToString('N') + '.tar.gz')
    try {
      try {
        Invoke-WebRequest -UseBasicParsing -Uri ($base + ${quote(hostPaths.bundle)} + '?k=' + $key) -OutFile $file
      } catch {
        throw ('Could not download sand from ' + $base + ': ' + $_.Exception.Message)
      }
      $dir = Join-Path $sandHome ('app\' + $build)
      if (Test-Path -LiteralPath $dir) { $dir = '{0}-{1}' -f $dir, [DateTimeOffset]::UtcNow.ToUnixTimeSeconds() }
      New-Item -ItemType Directory -Force -Path $dir | Out-Null
      $made = $true
      $env:SAND_BUNDLE = $file
      $env:SAND_DIR = $dir
      try {
        Invoke-Quiet 'Unpacking sand' $bun @('-e', ${quote(unpack)})
      } finally {
        Remove-Item Env:SAND_BUNDLE, Env:SAND_DIR -ErrorAction SilentlyContinue
      }
    } finally {
      Remove-Item -LiteralPath $file -Force -ErrorAction SilentlyContinue
    }
    Invoke-Quiet 'Checking the download' $bun @((Join-Path $dir 'apps\sand\src\host\dist\release\ready.ts'), $dir)
    Write-Done 'Sand downloaded' $dir
`

const reportFailure = String.raw`    $failure = $_
    if ($made) {
      try { Remove-Item -LiteralPath $dir -Recurse -Force -ErrorAction SilentlyContinue } catch { }
    }
    Send-Failure ([string]$failure.Exception.Message)
    throw $failure
`

const handOver = String.raw`
  $main = Join-Path $dir 'apps\sand\src\main.ts'
  $env:SAND_INSTALL_KEY = $secret
  try {
    & {
      $ErrorActionPreference = 'Continue'
      & $bun $main install $base
    }
  } finally {
    Remove-Item Env:SAND_INSTALL_KEY -ErrorAction SilentlyContinue
  }
  $code = $LASTEXITCODE
  if ($code -ne 0) {
    if ($code -ne 3) { Send-Failure ('Setup on the new PC stopped (exit code ' + $code + '); see the terminal there') }
    throw 'Setup on this PC did not finish. Fix the problem above, then run the same command again.'
  }
`

const render = ({ base, secret, from, build, bun }: ScriptOptions) => String.raw`function Install-Sand {
  $ErrorActionPreference = 'Stop'
  $ProgressPreference = 'SilentlyContinue'
  $PSNativeCommandUseErrorActionPreference = $false
  $base = ${quote(base.replace(/\/+$/, ''))}
  $secret = ${quote(secret)}
  $from = ${quote(from)}
  $build = ${quote(build)}
  $bunVersion = ${quote(bun)}
  $key = [uri]::EscapeDataString($secret)
  $ok = [string][char]0x2713
  $arrow = [string][char]0x2192
${helpers}
  if ($base.StartsWith('https:')) {
    try { [Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12 } catch { }
  }
  if ($env:SAND_HOME) { $sandHome = $env:SAND_HOME } else { $sandHome = Join-Path $env:USERPROFILE '.sand' }

  Write-Host ('Sand from ' + $from + ' (build ' + $build + ')') -ForegroundColor DarkGray

  $made = $false
  try {
    if ($env:OS -ne 'Windows_NT') { throw 'This command is for Windows. On Linux or macOS, use the curl command from the Add a PC dialog.' }
${getBun}${download}  } catch {
${reportFailure}  }
${handOver}}

try {
  Install-Sand
} catch {
  Write-Host $_.Exception.Message -ForegroundColor Red
} finally {
  Remove-Item Function:\Install-Sand -ErrorAction SilentlyContinue
}
`

export const psScript: InstallScript = {
  contentType: 'text/plain; charset=utf-8',
  render,
  refuse: message => `Write-Host ${quote(message)} -ForegroundColor Red\n`,
}
