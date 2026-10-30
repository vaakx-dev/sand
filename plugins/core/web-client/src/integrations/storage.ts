const persistAsked = 'sand.persist'

export const askPersistence = () => {
  try {
    if (localStorage.getItem(persistAsked)) return
    localStorage.setItem(persistAsked, '1')
    void navigator.storage?.persist?.().catch(() => {})
  } catch {}
}
