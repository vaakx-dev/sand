import type { Report } from '@sand/kit'

export const progressPrinter = (): Report => {
  let last = ''
  return ({ phase, sent, total, text }) => {
    const percent = total ? Math.floor((sent / total) * 100) : 100
    const key = `${phase}:${percent}`
    if (key === last) return
    last = key
    console.log(`${phase}  ${text}  ${percent}%`)
  }
}
