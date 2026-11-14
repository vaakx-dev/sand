import type { ChatOwner, Fit } from './contract'

export interface Scope {
  owner?: ChatOwner
  chat?: string
}

const SHORTEST_PREFIX = 2

const quoted = (text: string) => `"${text.replaceAll('"', '""')}"`

const starred = (text: string, last = '') => `${quoted(text)}${last.length < SHORTEST_PREFIX ? '' : '*'}`

const FITS: Record<Fit, (words: string[]) => string> = {
  phrase: words => starred(words.join(' '), words.at(-1)),
  words: words => words.map((word, index) => (index === words.length - 1 ? starred(word, word) : quoted(word))).join(' '),
  prefixes: words => words.map(word => starred(word, word)).join(' '),
}

const chatText = (owner: ChatOwner, chat: string) => `${owner} ${chat}`

const fitMatch = (fit: Fit, words: string[]) => FITS[fit](words)

const scopedMatch = (words: string, { owner, chat }: Scope) =>
  [`text : (${words})`, ...(owner ? [`chat : ${quoted(owner)}`] : []), ...(chat ? [`chat : ${quoted(chat)}`] : [])].join(' AND ')

export { chatText, fitMatch, scopedMatch }
