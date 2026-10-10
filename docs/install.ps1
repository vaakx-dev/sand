function Install-Sand {
  $ErrorActionPreference = 'Stop'
  $ProgressPreference = 'SilentlyContinue'
  $PSNativeCommandUseErrorActionPreference = $false
  $repo = 'vaakx-dev/sand'
  $ok = [string][char]0x2713
  $arrow = [string][char]0x2192
  $channel = 'release'
  if ($env:SAND_CHANNEL) { $channel = $env:SAND_CHANNEL }
  $pair = $env:SAND_PAIR
  Remove-Item Env:SAND_PAIR, Env:SAND_CHANNEL -ErrorAction SilentlyContinue
  $base = ''
  $secret = ''
  $made = $false
  $dir = ''

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

  function Send-Step {
    param([string]$Step)
    if (-not $secret) { return }
    try {
      Invoke-WebRequest -UseBasicParsing -Method Post -TimeoutSec 10 -Uri ($base + '/install/step?k=' + $secret + '&step=' + $Step) | Out-Null
    } catch { }
  }

  function Send-Failure {
    param([string]$Text)
    if (-not $secret) { return }
    try {
      if ($Text.Length -gt 16000) { $Text = $Text.Substring(0, 16000) }
      $body = [Text.Encoding]::UTF8.GetBytes($Text)
      Invoke-WebRequest -UseBasicParsing -Method Post -ContentType 'text/plain; charset=utf-8' -Body $body -TimeoutSec 10 -Uri ($base + '/install/fail?k=' + $secret) | Out-Null
    } catch { }
  }

  function Get-File {
    param([string]$Uri, [string]$File, [string]$Problem)
    try {
      Invoke-WebRequest -UseBasicParsing -Uri $Uri -OutFile $File -Headers @{ 'User-Agent' = 'sand-install' }
    } catch {
      throw ($Problem + ': ' + $_.Exception.Message)
    }
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

  function Find-Release {
    if ($env:SAND_RELEASE_URL) {
      $url = $env:SAND_RELEASE_URL.TrimEnd('/')
      return @{ Assets = $url; Label = $url }
    }
    $tag = $channel
    if ($channel -eq 'release') {
      try {
        $releases = Invoke-RestMethod -UseBasicParsing -Uri ('https://api.github.com/repos/' + $repo + '/releases?per_page=50') -Headers @{ 'User-Agent' = 'sand-install'; 'Accept' = 'application/vnd.github+json' }
      } catch {
        throw ('Could not ask GitHub for the sand releases. Check the internet connection, or wait a few minutes if GitHub is limiting requests: ' + $_.Exception.Message)
      }
      $newest = $releases | Where-Object { -not $_.draft -and $_.published_at -and ([string]$_.tag_name).StartsWith('v') } | Sort-Object -Property published_at -Descending | Select-Object -First 1
      if (-not $newest) { throw 'There is no sand release on GitHub yet. Set $env:SAND_CHANNEL=''nightly'' to get the nightly build.' }
      $tag = [string]$newest.tag_name
    } elseif ($channel -ne 'nightly' -and $channel -ne 'dev') {
      throw ('Unknown channel ''' + $channel + '''; use release, nightly or dev.')
    }
    return @{ Assets = ('https://github.com/' + $repo + '/releases/download/' + $tag); Label = ('sand ' + $tag) }
  }

  function Get-Bun {
    param([string]$Version, [string]$Folder, [string]$Work)
    $bun = Join-Path $Folder 'bun.exe'
    if ((Get-BunVersion $bun) -eq $Version) {
      Write-Done ('Bun ' + $Version + ' ready')
      return $bun
    }
    Write-Host ('Downloading Bun ' + $Version + '...') -ForegroundColor DarkGray
    $from = 'https://github.com/oven-sh/bun/releases/download/bun-v' + $Version
    $sums = Join-Path $Work 'SHASUMS256.txt'
    Get-File ($from + '/SHASUMS256.txt') $sums ('Could not download Bun ' + $Version + ' from GitHub')
    $targets = @(Get-BunTargets)
    foreach ($target in $targets) {
      $zipName = 'bun-' + $target + '.zip'
      $want = ''
      foreach ($line in Get-Content -LiteralPath $sums) {
        $parts = $line.Trim() -split '\s+'
        if ($parts.Count -ge 2 -and $parts[1].TrimStart('*') -eq $zipName) { $want = $parts[0].ToUpper() }
      }
      if (-not $want) { continue }
      $zip = Join-Path $Work $zipName
      Get-File ($from + '/' + $zipName) $zip ('Could not download Bun ' + $Version + ' from GitHub')
      if ((Get-FileHash -Algorithm SHA256 -LiteralPath $zip).Hash -ne $want) { throw 'The Bun download from GitHub is damaged; run the command again' }
      $unzipped = Join-Path $Work 'bun'
      Expand-Archive -LiteralPath $zip -DestinationPath $unzipped -Force
      $exe = Join-Path $unzipped ('bun-' + $target + '\bun.exe')
      if ((Get-BunVersion $exe) -ne $Version) { throw ('Bun ' + $Version + ' does not run on this PC (' + $target + ')') }
      New-Item -ItemType Directory -Force -Path $Folder | Out-Null
      Move-Item -LiteralPath $exe -Destination $bun -Force
      [IO.File]::WriteAllText((Join-Path (Split-Path -Parent $Folder) 'target'), $target)
      Write-Done ('Bun ' + $Version) $bun
      return $bun
    }
    throw ('Bun ' + $Version + ' has no build for this PC (tried ' + ($targets -join ', ') + ')')
  }

  try { [Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12 } catch { }
  if ($env:SAND_HOME) { $sandHome = $env:SAND_HOME } else { $sandHome = Join-Path $env:USERPROFILE '.sand' }

  $work = Join-Path ([IO.Path]::GetTempPath()) ('sand-install-' + [guid]::NewGuid().ToString('N'))
  try {
    if ($pair) {
      $match = [regex]::Match($pair.Trim(), '^(https?://[^/#]+)/#install=([A-Za-z0-9_-]+)$')
      if (-not $match.Success) { throw 'The pairing link is not one from Add a PC. Copy the command again.' }
      $base = $match.Groups[1].Value
      $secret = $match.Groups[2].Value
    }
    Send-Step 'connected'
    if ($env:OS -ne 'Windows_NT') { throw 'This command is for Windows. On Linux or macOS, run the curl command instead.' }
    New-Item -ItemType Directory -Force -Path $work | Out-Null
    $release = Find-Release
    $label = $release.Label
    $stampFile = Join-Path $work 'sand-build.json'
    Get-File ($release.Assets + '/sand-build.json') $stampFile ('Could not download ' + $label + ' from GitHub. If it was just published, its files may still be uploading; try again in a few minutes')
    $stamp = Get-Content -Raw -LiteralPath $stampFile | ConvertFrom-Json
    $build = [string]$stamp.id
    $bunVersion = [string]$stamp.bun
    if ($build -notmatch '^[A-Za-z0-9][A-Za-z0-9_-]*$') { throw ('The build information of ' + $label + ' is damaged.') }
    if ($bunVersion -notmatch '^\d+\.\d+\.\d+$') { throw ('The build information of ' + $label + ' names no Bun version.') }
    Write-Host ('Installing ' + $label + ' (build ' + $build + ')') -ForegroundColor DarkGray
    $bun = Get-Bun $bunVersion (Join-Path $sandHome ('bun\' + $bunVersion)) $work

    Send-Step 'sand'
    Write-Host ('Downloading ' + $label + '...') -ForegroundColor DarkGray
    $file = Join-Path $work 'sand.tar.gz'
    Get-File ($release.Assets + '/sand.tar.gz') $file ('Could not download ' + $label)
    $dir = Join-Path $sandHome ('app\' + $build)
    if (Test-Path -LiteralPath $dir) { $dir = '{0}-{1}' -f $dir, [DateTimeOffset]::UtcNow.ToUnixTimeSeconds() }
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
    $made = $true
    $env:SAND_BUNDLE = $file
    $env:SAND_DIR = $dir
    try {
      Invoke-Quiet 'Unpacking sand' $bun @('-e', 'await new Bun.Archive(await Bun.file(process.env.SAND_BUNDLE).bytes()).extract(process.env.SAND_DIR)')
    } finally {
      Remove-Item Env:SAND_BUNDLE, Env:SAND_DIR -ErrorAction SilentlyContinue
    }
    Invoke-Quiet 'Checking the download' $bun @((Join-Path $dir 'apps\sand\src\host\dist\release\ready.ts'), $dir)
    Write-Done 'Sand downloaded' $dir
  } catch {
    $failure = $_
    if ($made) {
      try { Remove-Item -LiteralPath $dir -Recurse -Force -ErrorAction SilentlyContinue } catch { }
    }
    Send-Failure ([string]$failure.Exception.Message)
    throw $failure
  } finally {
    Remove-Item -LiteralPath $work -Recurse -Force -ErrorAction SilentlyContinue
  }

  $main = Join-Path $dir 'apps\sand\src\main.ts'
  if ($secret) { $env:SAND_INSTALL_KEY = $secret }
  $env:SAND_CHANNEL = $channel
  try {
    & {
      $ErrorActionPreference = 'Continue'
      if ($secret) { & $bun $main install $base } else { & $bun $main install }
    }
  } finally {
    Remove-Item Env:SAND_INSTALL_KEY, Env:SAND_CHANNEL -ErrorAction SilentlyContinue
  }
  $code = $LASTEXITCODE
  if ($code -ne 0) {
    if ($code -ne 3) { Send-Failure ('Setup on the new PC stopped (exit code ' + $code + '); see the terminal there') }
    throw 'Setup on this PC did not finish. Fix the problem above, then run the same command again.'
  }
}

try {
  Install-Sand
} catch {
  Write-Host $_.Exception.Message -ForegroundColor Red
} finally {
  Remove-Item Function:\Install-Sand -ErrorAction SilentlyContinue
}
