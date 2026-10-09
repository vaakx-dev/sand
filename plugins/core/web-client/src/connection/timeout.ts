export class TimedOut extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'TimedOut'
  }
}

export const within = <T>(promise: Promise<T>, wait: number, message: string, late?: (value: T) => void) =>
  new Promise<T>((resolve, reject) => {
    let expired = false
    const timer = setTimeout(() => {
      expired = true
      reject(new TimedOut(message))
    }, wait)
    promise.then(
      value => {
        clearTimeout(timer)
        if (expired) late?.(value)
        else resolve(value)
      },
      error => {
        clearTimeout(timer)
        reject(error)
      },
    )
  })
