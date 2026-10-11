import { after } from '../detached'

export class TimedOut extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'TimedOut'
  }
}

export const within = <T>(promise: Promise<T>, wait: number, message: string, late?: (value: T) => void) =>
  new Promise<T>((resolve, reject) => {
    let expired = false
    const cancel = after(wait, () => {
      expired = true
      reject(new TimedOut(message))
    })
    promise.then(
      value => {
        cancel()
        if (expired) late?.(value)
        else resolve(value)
      },
      error => {
        cancel()
        reject(error)
      },
    )
  })
