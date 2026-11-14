interface Format {
  bold: boolean
  italic: boolean
  underline: boolean
}

interface Run extends Format {
  text: string
}

type Paragraph = Run[]

type Page = Paragraph[]

interface Group extends Format {
  skip: boolean
  hidden: boolean
  fontTable: boolean
  font: number
  fallbackChars: number
}

const MAX_DEPTH = 256
const MAX_TEXT_LENGTH = 8_000_000
const MAX_PAGES = 2_000
const MAX_FALLBACK = 10
const CONTROL_WORD = /([a-zA-Z]{1,32})(-?\d{1,10})? ?/y
const PLAIN: Format = { bold: false, italic: false, underline: false }

const SKIPPED = new Set([
  'aftnsep', 'aftnsepc', 'author', 'colortbl', 'datastore', 'docvar', 'fldinst', 'filetbl', 'footer', 'footerf', 'footerl', 'footerr', 'ftnsep', 'ftnsepc', 'generator', 'header',
  'headerf', 'headerl', 'headerr', 'info', 'latentstyles', 'listoverridetable', 'listtable', 'mmathPr', 'nonshppict', 'object', 'operator', 'pgdsctbl', 'pict', 'revtbl', 'rsidtbl',
  'stylesheet', 'themedata', 'userprops', 'xmlnstbl',
])

const UNDERLINES = new Set(['ul', 'uld', 'uldash', 'uldashd', 'uldashdd', 'uldb', 'ulhwave', 'ulldash', 'ulth', 'ulthd', 'ulthdash', 'ulthdashd', 'ulthdashdd', 'ulthldash', 'ululdbwave', 'ulw', 'ulwave'])

const SYMBOLS: Record<string, string> = {
  bullet: '•',
  emdash: '—',
  endash: '–',
  emspace: '\u2003',
  enspace: '\u2002',
  qmspace: '\u2005',
  lquote: '‘',
  rquote: '’',
  ldblquote: '“',
  rdblquote: '”',
  tab: '\t',
  cell: '\t',
  line: '\n',
}

const CODE_PAGES: Record<number, string> = { 65001: 'utf-8', 932: 'shift_jis', 936: 'gbk', 949: 'euc-kr', 950: 'big5', 874: 'windows-874', 866: 'ibm866', 10000: 'macintosh' }

const CHARSETS: Record<number, string> = {
  77: 'macintosh',
  128: 'shift_jis',
  129: 'euc-kr',
  134: 'gbk',
  136: 'big5',
  161: 'windows-1253',
  162: 'windows-1254',
  163: 'windows-1258',
  177: 'windows-1255',
  178: 'windows-1256',
  186: 'windows-1257',
  204: 'windows-1251',
  222: 'windows-874',
  238: 'windows-1250',
}

const decoderFor = (label: string | undefined) => {
  if (!label) return undefined
  try {
    return new TextDecoder(label)
  } catch {
    return undefined
  }
}

const BYTE_CHUNK = 8_192

const byteString = (bytes: Uint8Array) =>
  Array.from({ length: Math.ceil(bytes.length / BYTE_CHUNK) }, (_, index) => String.fromCharCode(...bytes.subarray(index * BYTE_CHUNK, (index + 1) * BYTE_CHUNK))).join('')

const sameFormat = (run: Run, format: Format) => run.bold === format.bold && run.italic === format.italic && run.underline === format.underline

class RtfReader {
  #source: string
  #at = 0
  #group: Group = { ...PLAIN, skip: false, hidden: false, fontTable: false, font: 0, fallbackChars: 1 }
  #groups: Group[] = []
  #documentDecoder = new TextDecoder('windows-1252')
  #fontDecoders = new Map<number, TextDecoder>()
  #defaultFont = 0
  #fallback = 0
  #pending: number[] = []
  #pages: Page[] = []
  #page: Page = []
  #paragraph: Paragraph = []
  #length = 0

  constructor(bytes: Uint8Array) {
    this.#source = byteString(bytes)
  }

  read(): Page[] {
    if (!this.#source.startsWith('{\\rtf')) throw new Error("it isn't a rich text file")
    while (this.#at < this.#source.length) this.#step()
    this.#flush()
    if (this.#paragraph.length) this.#endParagraph()
    if (this.#page.length || !this.#pages.length) this.#pages.push(this.#page)
    return this.#pages
  }

  #step() {
    const char = this.#source[this.#at++]
    if (char === '{') return this.#open()
    if (char === '}') return this.#close()
    if (char === '\\') return this.#control()
    if (char === '\r' || char === '\n') return
    this.#byte(char?.charCodeAt(0) ?? 0)
  }

  #open() {
    this.#flush()
    this.#fallback = 0
    if (this.#groups.length >= MAX_DEPTH) throw new Error('it is nested too deeply')
    this.#groups.push({ ...this.#group })
  }

  #close() {
    this.#flush()
    this.#fallback = 0
    const parent = this.#groups.pop()
    if (!parent) throw new Error('it is damaged: a group closes that never opened')
    this.#group = parent
  }

  #control() {
    const next = this.#source[this.#at]
    if (next === "'") return this.#hexByte()
    this.#flush()
    if (next !== undefined && /[a-zA-Z]/.test(next)) return this.#word()
    this.#at++
    if (next === '\\' || next === '{' || next === '}') return this.#text(next)
    if (next === '~') return this.#text('\u00a0')
    if (next === '_') return this.#text('\u2011')
    if (next === '*') this.#set({ skip: true })
    if (next === '\n' || next === '\r') this.#endParagraphIfShown()
  }

  #hexByte() {
    const hex = this.#source.slice(this.#at + 1, this.#at + 3)
    this.#at += 3
    if (/^[\da-f]{2}$/i.test(hex)) this.#byte(Number.parseInt(hex, 16))
  }

  #word() {
    CONTROL_WORD.lastIndex = this.#at
    const match = CONTROL_WORD.exec(this.#source)
    if (!match) return
    this.#at += match[0].length
    const [, word = '', digits] = match
    if (this.#fallbackTakes()) return
    this.#apply(word, digits === undefined ? undefined : Number(digits))
  }

  #apply(word: string, parameter: number | undefined) {
    const symbol = SYMBOLS[word]
    if (symbol) return this.#text(symbol)
    if (SKIPPED.has(word)) return this.#set({ skip: true })
    if (UNDERLINES.has(word)) return this.#set({ underline: parameter !== 0 })
    switch (word) {
      case 'par':
      case 'sect':
      case 'row':
        return this.#endParagraphIfShown()
      case 'page':
        return this.#endPageIfShown()
      case 'u':
        return this.#unicode(parameter ?? 0)
      case 'uc':
        return this.#set({ fallbackChars: Math.min(Math.max(parameter ?? 1, 0), MAX_FALLBACK) })
      case 'b':
        return this.#set({ bold: parameter !== 0 })
      case 'i':
        return this.#set({ italic: parameter !== 0 })
      case 'ulnone':
        return this.#set({ underline: false })
      case 'v':
        return this.#set({ hidden: parameter !== 0 })
      case 'plain':
        return this.#set({ ...PLAIN, font: this.#defaultFont })
      case 'f':
        return this.#set({ font: parameter ?? 0 })
      case 'deff':
        this.#defaultFont = parameter ?? 0
        return this.#set({ font: this.#defaultFont })
      case 'fonttbl':
        return this.#set({ skip: true, fontTable: true })
      case 'fcharset':
        return this.#charset(parameter ?? 0)
      case 'ansicpg':
        this.#documentDecoder = decoderFor(CODE_PAGES[parameter ?? 0] ?? `windows-${parameter}`) ?? this.#documentDecoder
        return
      case 'mac':
        this.#documentDecoder = new TextDecoder('macintosh')
        return
      case 'bin':
        this.#at = Math.min(this.#source.length, this.#at + Math.max(0, parameter ?? 0))
        return
    }
  }

  #set(change: Partial<Group>) {
    this.#group = { ...this.#group, ...change }
  }

  #charset(charset: number) {
    const decoder = this.#group.fontTable ? decoderFor(CHARSETS[charset]) : undefined
    if (decoder) this.#fontDecoders.set(this.#group.font, decoder)
  }

  #unicode(code: number) {
    this.#fallback = 0
    this.#text(String.fromCharCode(code < 0 ? code + 0x10000 : code))
    this.#fallback = this.#group.fallbackChars
  }

  #shown() {
    return !this.#group.skip && !this.#group.hidden
  }

  #fallbackTakes() {
    if (this.#fallback === 0) return false
    this.#fallback--
    return true
  }

  #byte(value: number) {
    if (!this.#fallbackTakes() && this.#shown()) this.#pending.push(value)
  }

  #flush() {
    if (!this.#pending.length) return
    const decoder = this.#fontDecoders.get(this.#group.font) ?? this.#documentDecoder
    const text = decoder.decode(new Uint8Array(this.#pending))
    this.#pending = []
    this.#append(text)
  }

  #text(text: string) {
    if (!this.#fallbackTakes() && this.#shown()) this.#append(text)
  }

  #append(text: string) {
    this.#length += text.length
    if (this.#length > MAX_TEXT_LENGTH) throw new Error('it holds too much text to show')
    const last = this.#paragraph.at(-1)
    if (last && sameFormat(last, this.#group)) last.text += text
    else this.#paragraph.push({ text, bold: this.#group.bold, italic: this.#group.italic, underline: this.#group.underline })
  }

  #endParagraph() {
    this.#page.push(this.#paragraph)
    this.#paragraph = []
  }

  #endParagraphIfShown() {
    if (this.#shown()) this.#endParagraph()
  }

  #endPageIfShown() {
    if (!this.#shown()) return
    if (this.#paragraph.length) this.#endParagraph()
    if (this.#pages.length >= MAX_PAGES) throw new Error(`it has more than ${MAX_PAGES} pages`)
    this.#pages.push(this.#page)
    this.#page = []
  }
}

const parseRtf = (bytes: Uint8Array) => new RtfReader(bytes).read()

export { parseRtf, type Page, type Paragraph, type Run }
