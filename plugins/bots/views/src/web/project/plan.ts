export interface PlanItem {
  title: string
  note: string
  ref?: string
}

export interface Plan {
  items: PlanItem[]
  rest: string
}

const bullet = /^ {0,3}(?:[-*+]|\d+[.)])\s+(?:\[[ xX]\]\s+)?(.*)$/

const heading = /^ {0,3}#{1,6}\s/

const link = /\[([^\]]+)\]\(([a-z][\w-]*):([^)\s]+)\)/

const separator = /^\s*(?::|—|–|-)\s*/

const splitPlain = (text: string): PlanItem => {
  const cut = text.search(/: | — | – /)
  if (cut < 0) return { title: text, note: '' }
  return { title: text.slice(0, cut), note: text.slice(cut).replace(separator, '') }
}

const itemOf = (text: string, schemes: string[]): PlanItem => {
  const found = link.exec(text)
  if (!found) return splitPlain(text)
  const [whole, label = '', scheme = '', target = ''] = found
  const before = text.slice(0, found.index).trim()
  const after = text.slice(found.index + whole.length).replace(separator, '').trim()
  const note = [before, after].filter(Boolean).join(' ')
  return schemes.includes(scheme) ? { title: label, note, ref: `${scheme}:${target}` } : { title: label, note }
}

const withoutBareHeadings = (lines: string[]) =>
  lines.filter((line, index) => {
    if (!heading.test(line)) return true
    const next = lines.slice(index + 1).findIndex(other => heading.test(other))
    const body = lines.slice(index + 1, next < 0 ? undefined : index + 1 + next)
    return body.some(other => other.trim())
  })

export const parsePlan = (source: string, schemes: string[]): Plan => {
  const items: string[] = []
  const rest: string[] = []
  let inItem = false
  for (const line of source.split(/\r?\n/)) {
    const started = bullet.exec(line)
    if (started) {
      items.push(started[1]?.trim() ?? '')
      inItem = true
    } else if (inItem && /^\s+\S/.test(line)) items[items.length - 1] += ` ${line.trim()}`
    else {
      inItem = false
      rest.push(line)
    }
  }
  return {
    items: items.filter(Boolean).map(text => itemOf(text, schemes)),
    rest: withoutBareHeadings(rest)
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim(),
  }
}
