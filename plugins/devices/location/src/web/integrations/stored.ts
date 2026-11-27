const KEY = 'sand.location'

const readSharing = () => localStorage.getItem(KEY) !== 'off'

const writeSharing = (on: boolean) => localStorage.setItem(KEY, on ? 'on' : 'off')

export { readSharing, writeSharing }
