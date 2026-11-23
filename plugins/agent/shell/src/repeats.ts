const RECENT_LINES = 32
const TEMPLATE_REPEATS = 20
const PARTIAL_CHARS = 8_192

const TOKEN = /(?<counter>\d+(?:\.\d+)?%|\d+\/\d+)|(?<path>[^\s'"()[\]]*[\\/][^\s'"()[\]]*)|(?<hex>\b0x[0-9a-f]+\b|\b(?=[0-9a-f]*\d)[0-9a-f]{6,}\b)|\d+/gi
const PATH_PARTS = /[\\/]+/
const POSITION = /(:\d+)+:?$/

const nameOf = (path: string) => path.replace(POSITION, '').split(PATH_PARTS).filter(Boolean).at(-1) ?? ''

const normalised = (line: string, pathAs: (name: string) => string) =>
  line
    .replace(TOKEN, (_token, counter?: string, path?: string, hex?: string) => {
      if (counter) return counter
      if (path) return pathAs(nameOf(path))
      return hex ? '<hex>' : '<n>'
    })
    .replace(/\s+/g, ' ')
    .trim()

const shapeOf = (line: string) => normalised(line, name => name)

const templateOf = (line: string) => normalised(line, () => '<path>')

class Window {
  #keys: string[] = []
  #counts = new Map<string, number>()

  count(key: string) {
    return this.#counts.get(key) ?? 0
  }

  add(key: string) {
    this.#keys.push(key)
    this.#counts.set(key, this.count(key) + 1)
    if (this.#keys.length > RECENT_LINES) this.#forget(this.#keys.shift() ?? key)
  }

  #forget(key: string) {
    const left = this.count(key) - 1
    if (left) this.#counts.set(key, left)
    else this.#counts.delete(key)
  }
}

class Repeats {
  #partial = ''
  #shapes = new Window()
  #templates = new Window()
  #sample: string | undefined

  hear(text: string) {
    const parts = (this.#partial + text).split(/\r\n|\r|\n/)
    this.#partial = (parts.pop() ?? '').slice(0, PARTIAL_CHARS)
    if (!parts.length) return 'new'
    const lines = parts.filter(line => line.trim())
    const fresh = lines.map(line => this.#remember(line)).includes('new')
    this.#sample = fresh ? undefined : (lines.at(-1) ?? this.#sample)
    return fresh ? 'new' : 'repeat'
  }

  get sample() {
    return this.#sample
  }

  #remember(line: string) {
    const shape = shapeOf(line)
    const template = templateOf(line)
    const seen = this.#shapes.count(shape) > 0 || this.#templates.count(template) >= TEMPLATE_REPEATS
    this.#shapes.add(shape)
    this.#templates.add(template)
    return seen ? 'repeat' : 'new'
  }
}

export { Repeats }
