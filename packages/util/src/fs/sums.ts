export const shaSumFor = (sums: string, file: string) => {
  for (const line of sums.split('\n')) {
    const [sha, name] = line.trim().split(/\s+/)
    if (name?.replace(/^\*/, '') === file && sha && /^[0-9a-f]{64}$/i.test(sha)) return sha.toLowerCase()
  }
}
