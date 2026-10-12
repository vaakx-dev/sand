import { errorMessage } from '../text/error'

export const eachSettled = async <I, T>(items: I[], run: (item: I) => Promise<T>) => {
  const settled = await Promise.allSettled(items.map(run))
  return {
    values: settled.flatMap(result => (result.status === 'fulfilled' ? [result.value] : [])),
    errors: settled.flatMap(result => (result.status === 'rejected' ? [errorMessage(result.reason)] : [])),
  }
}
