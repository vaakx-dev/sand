import type { PcIcon, Registry } from '@sand/devices-contract'
import { errorMessage } from '@sand/util'
import { readdir } from 'node:fs/promises'

const output = async (command: string[]) => {
  const proc = Bun.spawn(command, { stdin: 'ignore', stdout: 'pipe', stderr: 'ignore', windowsHide: true })
  const text = await new Response(proc.stdout).text()
  await proc.exited
  return text
}

const windowsBattery = async () =>
  Number((await output(['powershell.exe', '-NoProfile', '-NonInteractive', '-Command', '@(Get-CimInstance Win32_Battery).Count'])).trim()) > 0

const macBattery = async () => (await output(['pmset', '-g', 'batt'])).includes('InternalBattery')

const linuxBattery = async () => (await readdir('/sys/class/power_supply')).some(name => name.startsWith('BAT'))

const hasBattery = () => {
  if (process.platform === 'win32') return windowsBattery()
  if (process.platform === 'darwin') return macBattery()
  return linuxBattery()
}

const detectIcon = async (): Promise<PcIcon> => ((await hasBattery().catch(() => false)) ? 'laptop' : 'desktop')

export const detectIconOnce = (registry: Registry, pc: string) => {
  if (registry.get(pc)?.detectedIcon) return
  void detectIcon()
    .then(icon => registry.setDetectedIcon(pc, icon))
    .catch((error: unknown) => console.error(`couldn't save this PC's icon: ${errorMessage(error)}`))
}
