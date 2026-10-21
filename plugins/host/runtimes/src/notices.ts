import type { FailedPlugin } from './contract'

export const listFailed = (failed: FailedPlugin[]) => failed.map(plugin => `${plugin.id}: ${plugin.error}`).join('; ')

const joined = (names: string[]) => (names.length < 2 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`)

export const restoredText = (names: string[]) =>
  `Your change to ${joined(names)} stopped sand from starting, so the previous version is back. Settings › Plugins › ${joined(names)} › History has both.`
