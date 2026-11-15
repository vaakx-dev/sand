import { expect, test } from 'bun:test'
import { mkdtemp, readdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { isRecord } from '../src'
import { readState } from '../src/fs'

const DAMAGED = /^drafts\.json\.damaged-\d{4}-\d\d-\d\dT\d\d-\d\d-\d\d-\d{3}Z$/

const counted = (data: unknown) => (isRecord(data) && typeof data.count === 'number' ? data.count : undefined)

test('readState reads a good file and sets a damaged one aside with a timestamp so callers start from defaults', async () => {
  const home = await mkdtemp(join(tmpdir(), 'sand-state-'))
  try {
    const file = join(home, 'drafts.json')
    expect(await readState(file, counted)).toBeUndefined()

    await Bun.write(file, '{"count": 3}')
    expect(await readState(file, counted)).toBe(3)

    await Bun.write(file, '{"count": 3}x')
    expect(await readState(file, counted)).toBeUndefined()
    const [aside] = await readdir(home)
    expect(aside).toMatch(DAMAGED)
    expect(await Bun.file(join(home, aside!)).text()).toBe('{"count": 3}x')

    await Bun.write(file, '{"count": "three"}')
    expect(await readState(file, counted)).toBeUndefined()
    expect((await readdir(home)).every(name => DAMAGED.test(name))).toBe(true)
  } finally {
    await rm(home, { recursive: true, force: true })
  }
})
