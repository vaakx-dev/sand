const asked = 'sand.persist'

export const onIdle = (run: () => void) => {
  if (typeof requestIdleCallback === 'function') requestIdleCallback(run, { timeout: 2000 })
  else setTimeout(run, 0)
}

export const askPersistence = () => {
  try {
    if (localStorage.getItem(asked)) return
    localStorage.setItem(asked, '1')
    void navigator.storage?.persist?.().catch(() => {})
  } catch {}
}
