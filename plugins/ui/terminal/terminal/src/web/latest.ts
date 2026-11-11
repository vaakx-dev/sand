export const latest = <T>(send: (value: T) => Promise<unknown>, same: (a: T, b: T) => boolean) => {
  let wanted: T | undefined
  let delivered: T | undefined
  let busy = false

  const pump = () => {
    if (busy || wanted === undefined || (delivered !== undefined && same(wanted, delivered))) return
    const value = wanted
    busy = true
    send(value).then(
      () => {
        busy = false
        delivered = value
        pump()
      },
      () => {
        busy = false
      },
    )
  }

  return {
    set(value: T) {
      wanted = value
      pump()
    },
    forget() {
      wanted = undefined
      delivered = undefined
    },
    retry() {
      delivered = undefined
      pump()
    },
  }
}
