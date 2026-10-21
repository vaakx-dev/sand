export const joinDisposers =
  (...disposers: (() => unknown)[]) =>
  () =>
    disposers.forEach(dispose => void dispose())
