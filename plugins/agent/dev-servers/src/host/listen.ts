export const firstListening = <T>(hostnames: string[], listen: (hostname: string) => T) => {
  const failures: unknown[] = []
  for (const hostname of hostnames) {
    try {
      return listen(hostname)
    } catch (error) {
      failures.push(error)
    }
  }
  throw new AggregateError(failures, "sand couldn't open a port for this dev server")
}
