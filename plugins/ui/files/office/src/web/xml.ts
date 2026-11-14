import type { Archive } from './archive'

interface Relationship {
  type: string
  target: string
}

const DECLARED_ENTITIES = /<!DOCTYPE/i

const xml = (text: string) => {
  if (DECLARED_ENTITIES.test(text)) throw new Error('it declares XML entities, which the viewer refuses')
  const parsed = new DOMParser().parseFromString(text, 'application/xml')
  if (parsed.getElementsByTagName('parsererror').length > 0) throw new Error('part of it is damaged')
  return parsed.documentElement
}

const partXml = async (archive: Archive, name: string) => xml(await archive.text(name))

const children = (node: Element | undefined, name: string) => [...(node?.children ?? [])].filter(child => child.localName === name)

const child = (node: Element | undefined, name: string) => [...(node?.children ?? [])].find(found => found.localName === name)

const path = (node: Element | undefined, ...names: string[]) => names.reduce<Element | undefined>((found, name) => child(found, name), node)

const descendants = (node: Element | undefined, name: string) => [...(node?.getElementsByTagNameNS('*', name) ?? [])]

const relationId = (node: Element | undefined, name = 'id') =>
  [...(node?.attributes ?? [])].find(attribute => attribute.localName === name && attribute.namespaceURI?.endsWith('/relationships'))?.value

const numberAttribute = (node: Element | undefined, name: string) => {
  const value = node?.getAttribute(name)
  if (value === null || value === undefined || value === '') return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

const folderOf = (part: string) => part.slice(0, part.lastIndexOf('/') + 1)

const decoded = (target: string) => {
  try {
    return decodeURI(target)
  } catch {
    return target
  }
}

const resolved = (part: string, target: string) => {
  const joined = target.startsWith('/') ? target.slice(1) : folderOf(part) + target
  const segments = joined.split('/').reduce<string[]>((kept, segment) => {
    if (segment === '..') return kept.slice(0, -1)
    if (segment === '.' || segment === '') return kept
    return [...kept, segment]
  }, [])
  return decoded(segments.join('/'))
}

const relationshipsOf = (part: string) => `${folderOf(part)}_rels/${part.slice(folderOf(part).length)}.rels`

const relationships = async (archive: Archive, part: string) => {
  const name = relationshipsOf(part)
  if (!archive.has(name)) return new Map<string, Relationship>()
  const internal = children(await partXml(archive, name), 'Relationship').filter(found => found.getAttribute('TargetMode') !== 'External')
  return new Map(
    internal.map(found => [
      found.getAttribute('Id') ?? '',
      { type: (found.getAttribute('Type') ?? '').split('/').pop() ?? '', target: resolved(part, found.getAttribute('Target') ?? '') },
    ]),
  )
}

const relatedOfType = (related: Map<string, Relationship>, type: string) => [...related.values()].find(found => found.type === type)?.target

const mainPart = async (archive: Archive) => relatedOfType(await relationships(archive, ''), 'officeDocument')

export { child, children, descendants, mainPart, numberAttribute, partXml, path, relatedOfType, relationId, relationships, type Relationship }
