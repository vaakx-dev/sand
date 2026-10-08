import { listBlock, listItem, taskItem } from '../nodes'
import type { Refs } from './refs'
import { indentOf, listMarker, sameList, startsBlock, type ListMarker } from './rules'

type Parse = (lines: string[], refs: Refs) => Node[]

const collectItem = (lines: string[], start: number, marker: ListMarker) => {
  const body = [marker.text]
  let index = start + 1
  let blank = false
  while (index < lines.length) {
    const line = lines[index]!
    const indent = indentOf(line)
    const nested = listMarker(line)
    if (!line.trim()) body.push('')
    else if (indent >= marker.content) body.push(line.slice(marker.content))
    else if (nested && indent > marker.indent) body.push(line.slice(indent))
    else if (!blank && !nested && !startsBlock(line)) body.push(line.trimStart())
    else break
    blank = !line.trim()
    index++
  }
  let trailing = 0
  while (body.length > 1 && body.at(-1) === '') {
    body.pop()
    trailing++
  }
  return { body, next: index, blankAfter: trailing > 0 }
}

const looseInside = (body: string[]) =>
  body.some((line, index) => {
    const next = body[index + 1]
    return !line && !!next && !/^\s/.test(next) && !listMarker(next)
  })

const taskMark = /^\[([ xX])\][ \t]+/

const unwrap = (node: Node) => (node.nodeName === 'P' ? [...node.childNodes] : [node])

const itemView = (body: string[], loose: boolean, refs: Refs, parse: Parse) => {
  const task = taskMark.exec(body[0]!)
  if (!task) {
    const children = parse(body, refs)
    return listItem(loose ? children : children.flatMap(unwrap))
  }
  const [first, ...rest] = parse([body[0]!.slice(task[0].length), ...body.slice(1)], refs)
  return taskItem(task[1] !== ' ', [...(first ? unwrap(first) : []), ...(loose ? rest : rest.flatMap(unwrap))])
}

export const parseList = (lines: string[], start: number, refs: Refs, parse: Parse) => {
  const first = listMarker(lines[start]!)!
  const items: string[][] = []
  let loose = false
  let index = start
  while (sameList(listMarker(lines[index] ?? ''), first)) {
    const item = collectItem(lines, index, listMarker(lines[index]!)!)
    items.push(item.body)
    loose ||= looseInside(item.body)
    index = item.next
    if (item.blankAfter && sameList(listMarker(lines[index] ?? ''), first)) loose = true
  }
  const tasks = items.every(body => taskMark.test(body[0]!))
  return { node: listBlock(first.ordered, first.start, tasks, items.map(body => itemView(body, loose, refs, parse))), next: index }
}
