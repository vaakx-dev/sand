const secretsOf = (values: string[]) => values.filter(Boolean).toSorted((a, b) => b.length - a.length)

export const masked = (text: string, values: string[]) => secretsOf(values).reduce((out, value) => out.replaceAll(value, '***'), text)

export const maskedStream = (values: string[], emit: (text: string) => void) => {
  const secrets = secretsOf(values)
  const held = Math.max(0, (secrets[0]?.length ?? 0) - 1)
  let pending = ''
  return {
    add(chunk: string) {
      pending = masked(pending + chunk, secrets)
      const ready = pending.length - held
      if (ready <= 0) return
      emit(pending.slice(0, ready))
      pending = pending.slice(ready)
    },
    end() {
      if (pending) emit(pending)
      pending = ''
    },
  }
}
