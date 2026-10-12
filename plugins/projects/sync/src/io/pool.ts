import { limited } from '@sand/kit'

export const mapLimit = <T, R>(items: T[], size: number, task: (item: T) => Promise<R>) => {
  const run = limited(size)
  return Promise.all(items.map(item => run(() => task(item))))
}
