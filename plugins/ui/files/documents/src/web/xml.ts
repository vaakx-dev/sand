const MAX_XML_LENGTH = 24 * 1024 * 1024
const MAX_ELEMENTS = 250_000
const MAX_DEPTH = 200
const ENTITY_DECLARATION = /<!ENTITY/i

const NS = {
  office: 'urn:oasis:names:tc:opendocument:xmlns:office:1.0',
  text: 'urn:oasis:names:tc:opendocument:xmlns:text:1.0',
  table: 'urn:oasis:names:tc:opendocument:xmlns:table:1.0',
  draw: 'urn:oasis:names:tc:opendocument:xmlns:drawing:1.0',
  style: 'urn:oasis:names:tc:opendocument:xmlns:style:1.0',
  fo: 'urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0',
  presentation: 'urn:oasis:names:tc:opendocument:xmlns:presentation:1.0',
  xlink: 'http://www.w3.org/1999/xlink',
}

type Space = keyof typeof NS

const SPACES = new Map(Object.entries(NS).map(([space, uri]) => [uri, space]))

const failed = (parsed: Document) => parsed.getElementsByTagName('parsererror').length > 0

const checked = (parsed: Document) => {
  if (parsed.getElementsByTagName('*').length > MAX_ELEMENTS) throw new Error('it holds too much content to show')
  return parsed
}

const parse = (source: string, type: DOMParserSupportedType) => {
  if (source.length > MAX_XML_LENGTH) throw new Error('its content is too large to show')
  if (ENTITY_DECLARATION.test(source)) throw new Error('it declares its own XML entities, which are not supported')
  return new DOMParser().parseFromString(source, type)
}

const parseXml = (source: string) => {
  const parsed = parse(source, 'application/xml')
  if (failed(parsed)) throw new Error("its XML couldn't be read")
  return checked(parsed)
}

const parseXhtml = (source: string) => {
  const strict = parse(source, 'application/xhtml+xml')
  return checked(failed(strict) ? parse(source, 'text/html') : strict)
}

const qualified = (element: Element) => `${SPACES.get(element.namespaceURI ?? '') ?? ''}:${element.localName}`

const attribute = (element: Element, space: Space, name: string) => element.getAttributeNS(NS[space], name)

const descendants = (root: Document | Element, space: Space, name: string) => [...root.getElementsByTagNameNS(NS[space], name)]

const named = (root: Document | Element, name: string) => [...root.getElementsByTagNameNS('*', name)]

export { attribute, descendants, MAX_DEPTH, named, NS, parseXhtml, parseXml, qualified }
