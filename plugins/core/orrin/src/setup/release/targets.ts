const cpus: Record<string, string> = { x64: 'x86_64', arm64: 'aarch64' }

const systems: Record<string, string[]> = {
  win32: ['pc-windows-msvc'],
  darwin: ['apple-darwin'],
  linux: ['unknown-linux-gnu', 'unknown-linux-musl'],
}

export const archiveExtensions = ['.zip', '.tar.gz']

export const hostTargets = () => {
  const cpu = cpus[process.arch]
  return cpu ? (systems[process.platform] ?? []).map(system => `${cpu}-${system}`) : []
}
