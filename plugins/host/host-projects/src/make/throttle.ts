const every = 150

export const throttled = (send: (text: string) => void) => {
  let last = 0
  let pending: string | undefined
  let timer: Timer | undefined
  const flush = () => {
    timer = undefined
    if (pending === undefined) return
    last = Date.now()
    send(pending)
    pending = undefined
  }
  return {
    push(text: string) {
      pending = text
      if (timer) return
      const wait = every - (Date.now() - last)
      if (wait <= 0) flush()
      else timer = setTimeout(flush, wait)
    },
    done() {
      clearTimeout(timer)
      flush()
    },
  }
}
