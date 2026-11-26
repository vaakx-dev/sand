import { expect, test } from 'bun:test'
import { forestOf, processes } from '../src'

const HELD_MB = 64
const MB = 1024 * 1024
const BUSY_MS = 300

const ready = (output: ReadableStream<Uint8Array>) => output.getReader().read()

test("a child's tree holds it and its own child, with their names, the memory they use and the CPU time they spent", async () => {
  const child = Bun.spawn([
    process.execPath,
    '-e',
    `const kept = Buffer.alloc(${HELD_MB} * ${MB}, 1); Bun.spawn([process.execPath, '-e', 'setInterval(() => {}, 1000)']); const end = Date.now() + ${BUSY_MS}; while (Date.now() < end); process.stdout.write('ready'); setInterval(() => kept.length, 1000)`,
  ], { stdout: 'pipe' })
  try {
    await ready(child.stdout)
    const tree = forestOf(await processes())([child.pid])
    const own = tree.find(entry => entry.pid === child.pid)

    expect(own).toMatchObject({ parent: process.pid, name: expect.stringMatching(/^bun/) })
    expect(own?.bytes).toBeGreaterThan(HELD_MB * MB)
    expect(own?.cpuMs).toBeGreaterThan(BUSY_MS / 2)
    expect(tree.filter(entry => entry.parent === child.pid)).toHaveLength(1)
  } finally {
    const grandchildren = forestOf(await processes())([child.pid]).filter(entry => entry.pid !== child.pid)
    grandchildren.forEach(entry => process.kill(entry.pid))
    child.kill()
  }
})
