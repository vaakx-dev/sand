$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding $false
Add-Type -AssemblyName UIAutomationClient, UIAutomationTypes
Add-Type -Namespace Sand -Name Native -MemberDefinition @'
[DllImport("user32.dll")] public static extern bool SetProcessDpiAwarenessContext(System.IntPtr value);
[DllImport("user32.dll")] public static extern System.IntPtr GetForegroundWindow();
[DllImport("user32.dll")] public static extern System.IntPtr FindWindow(string className, string title);
'@
[void][Sand.Native]::SetProcessDpiAwarenessContext([IntPtr]-4)

$element = [System.Windows.Automation.AutomationElement]
$cache = New-Object System.Windows.Automation.CacheRequest
$cache.Add($element::NameProperty)
$cache.Add($element::ControlTypeProperty)
$cache.Add($element::BoundingRectangleProperty)
$cache.AutomationElementMode = [System.Windows.Automation.AutomationElementMode]::None
$onScreen = New-Object System.Windows.Automation.PropertyCondition($element::IsOffscreenProperty, $false)
$limit = 3000

function Roots {
  foreach ($window in @([Sand.Native]::GetForegroundWindow(), [Sand.Native]::FindWindow('Shell_TrayWnd', $null))) {
    if ($window -ne [IntPtr]::Zero) { $element::FromHandle($window) }
  }
}

function Write-Elements {
  $lines = New-Object System.Text.StringBuilder
  $count = 0
  foreach ($root in Roots) {
    $cache.Push()
    try { $found = $root.FindAll([System.Windows.Automation.TreeScope]::Subtree, $onScreen) } finally { $cache.Pop() }
    foreach ($item in $found) {
      if ($count -ge $limit) { break }
      $rect = $item.Cached.BoundingRectangle
      if ($rect.IsEmpty -or $rect.Width -le 0 -or $rect.Height -le 0) { continue }
      $type = $item.Cached.ControlType.ProgrammaticName -replace '^ControlType\.', ''
      $name = $item.Cached.Name -replace "[`t`r`n]+", ' '
      [void]$lines.AppendLine("$type`t$name`t$([int]$rect.Left)`t$([int]$rect.Top)`t$([int]$rect.Right)`t$([int]$rect.Bottom)")
      $count++
    }
  }
  [Console]::Out.Write($lines.ToString())
}

while ($null -ne ($request = [Console]::In.ReadLine())) {
  try { Write-Elements } catch { [Console]::Out.WriteLine("error`t$($_.Exception.Message -replace "[`t`r`n]+", ' ')") }
  [Console]::Out.WriteLine('end')
  [Console]::Out.Flush()
}
