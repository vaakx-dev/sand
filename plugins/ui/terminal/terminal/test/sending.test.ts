import { expect, test } from 'bun:test'
import { limits } from '@sand/devices-terminal/contract'
import { type Batch, createInput } from '../src/web/input'
import { modified } from '../src/web/keys'
import { latest } from '../src/web/latest'

const settle = () => new Promise(resolve => setTimeout(resolve, 0))

const flakyLink = () => {
  const applied: string[] = []
  let last = 0
  let up = true
  const send = async (batch: Batch) => {
    if (!up) throw new Error('offline')
    if (batch.seq > last) {
      last = batch.seq
      applied.push(batch.data)
    }
  }
  return { applied, send, drop: () => void (up = false), restore: () => void (up = true) }
}

test('input typed across a dropped link reaches the shell once, in order, in batches the wire accepts', async () => {
  const link = flakyLink()
  const failures: unknown[] = []
  const input = createInput(link.send, error => void failures.push(error))
  input.type('ls\r')
  input.resume()
  input.type('cd src\r')
  await settle()

  link.drop()
  input.type('pwd\r')
  await settle()
  expect(failures).toHaveLength(1)
  input.pause()
  input.type('x'.repeat(limits.input + 10))
  link.restore()
  input.resume()
  input.resume()
  await settle()

  expect(link.applied).toEqual(['ls\r', 'cd src\r', 'pwd\r', 'x'.repeat(limits.input), 'x'.repeat(10)])
})

test('only the newest value is sent, one at a time, and a failure waits for the next change', async () => {
  const sent: number[] = []
  let fail = false
  let release = () => {}
  const offset = latest<number>(
    value =>
      new Promise<void>((resolve, reject) => {
        sent.push(value)
        release = () => (fail ? reject(new Error('offline')) : resolve())
      }),
    (a, b) => a === b,
  )
  offset.set(1)
  offset.set(2)
  offset.set(3)
  expect(sent).toEqual([1])
  release()
  await settle()
  expect(sent).toEqual([1, 3])
  release()
  await settle()
  offset.set(3)
  expect(sent).toEqual([1, 3])

  fail = true
  offset.set(4)
  release()
  await settle()
  expect(sent).toEqual([1, 3, 4])
  fail = false
  offset.retry()
  expect(sent).toEqual([1, 3, 4, 4])
})

test('held keys from the phone row turn into the sequences shells expect', () => {
  expect(modified('c', 'ctrl')).toBe('\x03')
  expect(modified('C', 'ctrl')).toBe('\x03')
  expect(modified('[', 'ctrl')).toBe('\x1b')
  expect(modified('?', 'ctrl')).toBe('\x7f')
  expect(modified('\x1b[A', 'ctrl')).toBe('\x1b[1;5A')
  expect(modified('\x1bOD', 'alt')).toBe('\x1b[1;3D')
  expect(modified('b', 'alt')).toBe('\x1bb')
  expect(modified('hello', 'ctrl')).toBe('hello')
})
