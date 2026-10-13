export interface SearchHit {
  title: string
  url: string
  snippet: string
}

const snippetLength = 1200

export const snippetOf = (text: string) => {
  const flat = text.replace(/\s+/g, ' ').trim()
  return flat.length > snippetLength ? `${flat.slice(0, snippetLength)}…` : flat
}

const hitText = (hit: SearchHit, index: number) => [`${index + 1}. ${hit.title || hit.url}`, `   ${hit.url}`, hit.snippet && `   ${hit.snippet}`].filter(Boolean).join('\n')

export const hitsText = (hits: SearchHit[]) => (hits.length ? hits.map(hitText).join('\n\n') : 'No results')
