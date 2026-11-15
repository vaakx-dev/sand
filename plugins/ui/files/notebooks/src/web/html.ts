import { imageProblem } from './notebook'

const MAX_HTML_LENGTH = 2_000_000
const DATA_IMAGES = /data:(image\/[\w.+-]+);base64,([\w+/=\s]*)/gi

const textsOf = (html: string) => {
  const parsed = new DOMParser().parseFromString(html, 'text/html')
  const nodes = [...parsed.querySelectorAll('*')]
  const attributes = nodes.flatMap(node => [...node.attributes].map(attribute => attribute.value))
  const styles = nodes.filter(node => node.tagName === 'STYLE').map(node => node.textContent ?? '')
  return [...attributes, ...styles]
}

const embeddedProblem = ([, type, data = '']: RegExpMatchArray) => (type?.toLowerCase() === 'image/svg+xml' ? undefined : imageProblem(data.replace(/\s/g, '')))

const htmlProblem = (html: string) => {
  if (html.length > MAX_HTML_LENGTH) return 'This HTML output is too large to show'
  const images = textsOf(html).flatMap(text => [...text.matchAll(DATA_IMAGES)])
  return images.map(embeddedProblem).find(Boolean)
}

export { htmlProblem }
