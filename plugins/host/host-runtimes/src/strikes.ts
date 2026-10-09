export const strikeLimit = 3
export const strikeWindow = 10 * 60_000

export const createStrikes = (now: () => number = Date.now) => {
  let times: number[] = []

  const add = () => {
    const at = now()
    times = [...times.filter(time => at - time < strikeWindow), at]
    return times.length >= strikeLimit
  }

  const reset = () => {
    times = []
  }

  return { add, reset }
}
