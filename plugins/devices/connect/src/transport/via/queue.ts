export const sendQueue = () => {
  let tail: Promise<void> = Promise.resolve()
  return {
    push(work: () => Promise<void>) {
      tail = tail.then(work, work)
    },
  }
}
