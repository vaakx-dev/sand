export const diskBytes = async (path: string, timeout = 4000) => {
  const du = Bun.spawn(['du', '-sk', '--', path], { stdin: 'ignore', stdout: 'pipe', stderr: 'ignore', timeout })
  const [text] = await Promise.all([new Response(du.stdout).text(), du.exited])
  const kilobytes = Number(text.split('\t')[0])
  return Number.isFinite(kilobytes) ? kilobytes * 1024 : 0
}
