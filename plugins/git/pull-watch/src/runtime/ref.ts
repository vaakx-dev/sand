import { type PullRef, pullRefOf } from '@sand/github/contract'

const SHORT_FORM = /^([\w.-]+\/[\w.-]+)#(\d+)$/

export const refOf = (text: string): PullRef => {
  const short = SHORT_FORM.exec(text.trim())
  const found = short?.[1] && short[2] ? { repo: short[1], number: Number(short[2]) } : pullRefOf(text.trim())
  if (!found) throw new Error(`${text} isn't a pull request; give its URL or owner/name#number.`)
  return found
}
