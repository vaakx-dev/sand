import { expect, test } from 'bun:test'
import { Repeats } from '../src/repeats'

const NAMES = ['alpha', 'bravo', 'charlie', 'delta', 'echo', 'foxtrot', 'golf', 'hotel', 'india', 'juliet', 'kilo', 'lima']
const FLOOD_NAMES = Array.from({ length: 30 }, (_, index) => `report${index}.txt`)

const heard = (lines: string[]) => {
  const repeats = new Repeats()
  return lines.map(line => repeats.hear(`${line}\n`))
}

test('lines about different files, with new percentages or counters, or with new words are new', () => {
  const progress = [
    ...NAMES.map(name => `Compiling src/${name}.ts`),
    ...NAMES.map(name => `Emitted C:\\work\\app\\${name}\\`),
    'Downloading 45%',
    'Downloading 46%',
    'Downloading 46.5%',
    '[3/10] Linking',
    '[4/10] Linking',
    'copied 12/300 files',
    'copied 13/300 files',
    ...NAMES.map(name => `passed ${name}`),
  ]
  expect(heard(progress)).not.toContain('repeat')
})

test('lines that differ only in times, positions, ids or hex repeat', () => {
  expect(
    heard([
      '12:00:01 error at src/app.ts:10:5 (pid 4123) after 35ms in 0x7ffe12',
      '12:00:02 error at /home/ci/src/app.ts:11:7 (pid 4124) after 41ms in 0x7ffe9a',
    ]),
  ).toEqual(['new', 'repeat'])
})

test('the same message about many different files repeats once it has come often enough', () => {
  const flood = heard(FLOOD_NAMES.map(name => `Cannot resolve the file C:\\data\\${name}`))
  expect(flood.slice(0, NAMES.length)).not.toContain('repeat')
  expect(flood.slice(-5)).toEqual(Array(5).fill('repeat'))
})
