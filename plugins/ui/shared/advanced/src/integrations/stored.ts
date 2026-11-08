const key = 'sand.advanced'

export const readStored = () => localStorage.getItem(key) === 'on'

export const writeStored = (on: boolean) => localStorage.setItem(key, on ? 'on' : 'off')
