const url = Bun.env.SAND_SSH_ASK
const body = JSON.stringify({ text: Bun.argv[2] ?? '', kind: Bun.env.SSH_ASKPASS_PROMPT ?? '' })
const reply = url ? await fetch(url, { method: 'POST', body }).catch(() => undefined) : undefined
if (!reply?.ok) process.exit(1)
process.stdout.write(`${await reply.text()}\n`)
