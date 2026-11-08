interface GhResult {
  code: number
  out: string
  err: string
}

const quiet = { GH_NO_UPDATE_NOTIFIER: '1', GH_SPINNER_DISABLED: '1', NO_COLOR: '1' }

export const ghPath = () => Bun.which('gh') ?? undefined

export const runGh = async (path: string, args: string[], timeoutMs = 15_000): Promise<GhResult> => {
  const child = Bun.spawn([path, ...args], {
    env: { ...process.env, ...quiet },
    stdin: 'ignore',
    stdout: 'pipe',
    stderr: 'pipe',
    timeout: timeoutMs,
    windowsHide: true,
  })
  const [out, err, code] = await Promise.all([new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited])
  return { code, out, err }
}
