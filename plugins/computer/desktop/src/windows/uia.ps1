$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding $false
Add-Type -AssemblyName UIAutomationClient, UIAutomationTypes
Add-Type -Namespace Sand -Name Native -MemberDefinition @'
[DllImport("user32.dll")] public static extern bool SetProcessDpiAwarenessContext(System.IntPtr value);
[DllImport("user32.dll")] public static extern System.IntPtr GetForegroundWindow();
[DllImport("user32.dll")] public static extern System.IntPtr FindWindow(string className, string title);
[DllImport("user32.dll")] public static extern bool IsWindowVisible(System.IntPtr window);
'@
[void][Sand.Native]::SetProcessDpiAwarenessContext([IntPtr]-4)

$element = [System.Windows.Automation.AutomationElement]
$cache = New-Object System.Windows.Automation.CacheRequest
$cache.Add($element::NameProperty)
$cache.Add($element::ControlTypeProperty)
$cache.Add($element::BoundingRectangleProperty)
$cache.Add($element::IsOffscreenProperty)
$cache.Add($element::NativeWindowHandleProperty)
$cache.TreeScope = [System.Windows.Automation.TreeScope]::Subtree
$cache.AutomationElementMode = [System.Windows.Automation.AutomationElementMode]::None
$limit = 5000

function Roots {
  foreach ($window in @([Sand.Native]::GetForegroundWindow(), [Sand.Native]::FindWindow('Shell_TrayWnd', $null))) {
    if ($window -ne [IntPtr]::Zero) { $element::FromHandle($window) }
  }
}

function Visibility($item) {
  $window = $item.Cached.NativeWindowHandle
  if ($window -ne 0 -and -not [Sand.Native]::IsWindowVisible([IntPtr]$window)) { return 'closed' }
  if ($item.Cached.IsOffscreen) { return 'offscreen' }
  'shown'
}

function Box($rect) {
  if ($rect.IsEmpty) { return "0`t0`t0`t0" }
  "$([int]$rect.Left)`t$([int]$rect.Top)`t$([int]$rect.Right)`t$([int]$rect.Bottom)"
}

function Write-Tree($item, $depth, $lines) {
  if ($script:count -ge $limit) { return }
  $script:count++
  $type = $item.Cached.ControlType.ProgrammaticName -replace '^ControlType\.', ''
  $name = $item.Cached.Name -replace "[`t`r`n]+", ' '
  [void]$lines.AppendLine("$depth`t$(Visibility $item)`t$type`t$name`t$(Box $item.Cached.BoundingRectangle)")
  foreach ($child in $item.CachedChildren) { Write-Tree $child ($depth + 1) $lines }
}

function Write-Elements {
  $lines = New-Object System.Text.StringBuilder
  $script:count = 0
  foreach ($root in Roots) { Write-Tree $root.GetUpdatedCache($cache) 0 $lines }
  [Console]::Out.Write($lines.ToString())
}

while ($null -ne ($request = [Console]::In.ReadLine())) {
  try { Write-Elements } catch { [Console]::Out.WriteLine("error`t$($_.Exception.Message -replace "[`t`r`n]+", ' ')") }
  [Console]::Out.WriteLine('end')
  [Console]::Out.Flush()
}
