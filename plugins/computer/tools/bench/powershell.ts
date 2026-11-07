const limitMs = 30_000

export const powershell = async (script: string) => {
  const encoded = Buffer.from(`$ProgressPreference = 'SilentlyContinue'\n${script}`, 'utf16le').toString('base64')
  const child = Bun.spawn(['powershell', '-NoProfile', '-NonInteractive', '-EncodedCommand', encoded], { stdout: 'pipe', stderr: 'pipe' })
  const timer = setTimeout(() => child.kill(), limitMs)
  const [out, error, code] = await Promise.all([new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited])
  clearTimeout(timer)
  if (code !== 0) throw new Error(`powershell failed (${code}): ${error.trim()}`)
  return out.trim()
}
