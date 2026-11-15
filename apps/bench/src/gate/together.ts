const allOrNone = async <T>(starting: Promise<T>[], undo: (started: T) => Promise<void>) => {
  const settled = await Promise.allSettled(starting)
  const started = settled.flatMap(result => (result.status === 'fulfilled' ? [result.value] : []))
  const failed = settled.find(result => result.status === 'rejected')
  if (!failed) return started
  await Promise.all(started.map(undo))
  throw failed.reason
}

export { allOrNone }
