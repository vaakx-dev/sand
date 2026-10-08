export const later = (run: () => void, ms: number) => {
  let timer: Timer | undefined
  return {
    schedule: () => {
      clearTimeout(timer)
      timer = setTimeout(run, ms)
    },
    cancel: () => clearTimeout(timer),
  }
}
