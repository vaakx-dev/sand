import { attribute, descendants, NS, qualified } from '../xml'

type Looks = Map<string, string>

const look = (properties: Element) =>
  [
    properties.getAttributeNS(NS.fo, 'font-weight') === 'bold' ? 'font-semibold' : '',
    properties.getAttributeNS(NS.fo, 'font-style') === 'italic' ? 'italic' : '',
    (attribute(properties, 'style', 'text-underline-style') ?? 'none') === 'none' ? '' : 'underline',
  ]
    .filter(Boolean)
    .join(' ')

const styleLooks = (content: Document): Looks =>
  new Map(
    descendants(content, 'style', 'style').flatMap(style => {
      const name = attribute(style, 'style', 'name')
      const properties = [...style.children].find(child => qualified(child) === 'style:text-properties')
      const classes = properties ? look(properties) : ''
      return name && classes ? [[name, classes] as const] : []
    }),
  )

export { styleLooks, type Looks }
