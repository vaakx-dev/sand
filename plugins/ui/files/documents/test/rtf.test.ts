import { expect, test } from 'bun:test'
import { type Page, parseRtf } from '../src/web/rtf/parse'

const bytes = (source: string) => Uint8Array.from(source, char => char.charCodeAt(0))

const pageTexts = (pages: Page[]) => pages.map(page => page.map(paragraph => paragraph.map(run => run.text).join('')))

test('rich text keeps its formatting, spaces, tabs and pages, and leaves out hidden destinations', () => {
  const pages = parseRtf(
    bytes(
      String.raw`{\rtf1\ansi{\fonttbl{\f0 Hidden font;}}{\info{\title Hidden title}}\b Reef\b0  memo\par Code:   LC\tab 7\par Shell\cell Price\cell\row {\field{\*\fldinst HYPERLINK "https://example.com"}{\fldrslt the page}}{\*\unknown \page hidden}\page Appendix\par}`,
    ),
  )
  expect(pageTexts(pages)).toEqual([['Reef memo', 'Code:   LC\t7', 'Shell\tPrice\t', 'the page'], ['Appendix']])
  expect(pages[0]?.[0]).toEqual([
    { text: 'Reef', bold: true, italic: false, underline: false },
    { text: ' memo', bold: false, italic: false, underline: false },
  ])
})

test('a Unicode character skips its fallback, which ends at the group boundary', () => {
  const fallbacks = ['?', String.raw`\'3f`, String.raw`\\`].map(fallback => pageTexts(parseRtf(bytes(String.raw`{\rtf1 a\u945${fallback}b{\u946}c\uc2\u947xyd}`))))
  expect(fallbacks).toEqual(Array(3).fill([['aαbβcγd']]))
})

test('bytes decode with the document code page and with each font charset', () => {
  const pages = parseRtf(bytes(String.raw`{\rtf1\ansi\ansicpg1251{\fonttbl{\f0 Arial;}{\f1\fcharset161 Greek;}}\'c0\'e1 {\f1 \'e1}\par Caf\'e9\par}`))
  expect(pageTexts(pages)).toEqual([['Аб α', 'Cafй']])
})

test('text that is not rich text says so', () => {
  expect(() => parseRtf(bytes('plain notes'))).toThrow("it isn't a rich text file")
})
