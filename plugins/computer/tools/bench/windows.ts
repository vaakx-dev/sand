import { existsSync } from 'node:fs'
import { powershell } from './powershell'

const native = `Add-Type -TypeDefinition @'
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Text;
public static class BenchWindows {
  delegate bool Visit(IntPtr window, IntPtr data);
  [DllImport("user32.dll")] static extern bool EnumWindows(Visit visit, IntPtr data);
  [DllImport("user32.dll")] static extern bool IsWindowVisible(IntPtr window);
  [DllImport("user32.dll", CharSet = CharSet.Unicode)] static extern int GetWindowText(IntPtr window, StringBuilder text, int length);
  [DllImport("user32.dll")] static extern uint GetWindowThreadProcessId(IntPtr window, out uint process);
  [DllImport("user32.dll")] static extern bool PostMessage(IntPtr window, uint message, IntPtr w, IntPtr l);
  static string Describe(uint id) {
    try {
      var process = Process.GetProcessById((int)id);
      long started = 0;
      try { started = new DateTimeOffset(process.StartTime).ToUnixTimeMilliseconds(); } catch (Exception) {}
      return process.ProcessName + "\\t" + started;
    } catch (Exception) { return "\\t0"; }
  }
  public static string[] Visible() {
    var found = new List<string>();
    EnumWindows((window, data) => {
      var title = new StringBuilder(256);
      GetWindowText(window, title, 256);
      if (!IsWindowVisible(window) || title.Length == 0) return true;
      uint process;
      GetWindowThreadProcessId(window, out process);
      found.Add(window.ToInt64() + "\\t" + Describe(process) + "\\t" + title);
      return true;
    }, IntPtr.Zero);
    return found.ToArray();
  }
  public static void Close(long window) { PostMessage(new IntPtr(window), 0x10, IntPtr.Zero, IntPtr.Zero); }
}
'@
`

export interface Window {
  handle: number
  process: string
  started: number
  title: string
}

const withNative = (script: string) => powershell(`${native}${script}`)

const rows = (text: string) =>
  text
    .split(/\r?\n/)
    .filter(Boolean)
    .map(line => line.split('\t'))

export const visibleWindows = async (): Promise<Window[]> =>
  rows(await withNative('[BenchWindows]::Visible()')).map(([handle = '0', process = '', started = '0', ...title]) => ({
    handle: Number(handle),
    process: process.toLowerCase(),
    started: Number(started),
    title: title.join('\t'),
  }))

const closeWindows = async (windows: Window[]) => {
  if (windows.length) await withNative(windows.map(({ handle }) => `[BenchWindows]::Close(${handle})`).join('\n'))
}

const folderScript = 'foreach ($window in (New-Object -ComObject Shell.Application).Windows()) { "$($window.HWND)`t$($window.Document.Folder.Self.Path)" }'

const explorerFolders = async () => new Map(rows(await powershell(folderScript)).map(([handle = '0', path = '']) => [Number(handle), path]))

const quoted = (text: string) => `'${text.replaceAll("'", "''")}'`

const navigateBack = async (folders: Map<number, string>) => {
  const now = await explorerFolders()
  const moved = [...folders].filter(([handle, path]) => now.has(handle) && now.get(handle) !== path && existsSync(path))
  if (!moved.length) return
  const targets = moved.map(([handle, path]) => `${quoted(String(handle))} = ${quoted(path)}`).join('; ')
  await powershell(`$back = @{ ${targets} }; foreach ($window in (New-Object -ComObject Shell.Application).Windows()) { $key = "$($window.HWND)"; if ($back.ContainsKey($key)) { $window.Navigate($back[$key]) } }`)
}

export interface Snapshot {
  at: number
  windows: Window[]
  folders: Map<number, string>
}

export const snapshot = async (): Promise<Snapshot> => ({ at: Date.now(), windows: await visibleWindows(), folders: await explorerFolders() })

const closeWait = 1_500

export const restore = async ({ at, windows, folders }: Snapshot, apps: string[]) => {
  const known = new Set(windows.map(window => window.handle))
  const opened = (await visibleWindows()).filter(window => !known.has(window.handle) && (apps.includes(window.process) || window.started >= at))
  await closeWindows(opened)
  await navigateBack(folders)
  await Bun.sleep(closeWait)
  const still = new Set((await visibleWindows()).map(window => window.handle))
  return opened.filter(window => still.has(window.handle))
}
