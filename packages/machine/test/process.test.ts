import { expect, test } from 'bun:test'
import { forestOf, processes } from '../src'

const HELD_MB = 64
const MB = 1024 * 1024

test("a child's tree holds it and its own child, with the memory they use, and never this process", async () => {
  const child = Bun.spawn([process.execPath, '-e', `const kept = Buffer.alloc(${HELD_MB} * ${MB}, 1); Bun.spawn([process.execPath, '-e', 'setInterval(() => {}, 1000)']); setInterval(() => kept.length, 1000)`])
  try {
    await Bun.sleep(1_500)
    const treeOf = forestOf(await processes())
    const tree = treeOf([child.pid, process.pid])
    const own = tree.find(entry => entry.pid === child.pid)

    expect(own?.parent).toBe(process.pid)
    expect(own?.bytes).toBeGreaterThan(HELD_MB * MB)
    expect(tree.filter(entry => entry.parent === child.pid)).toHaveLength(1)
    expect(tree.some(entry => entry.pid === process.pid)).toBe(false)
  } finally {
    const grandchildren = forestOf(await processes())([child.pid]).filter(entry => entry.pid !== child.pid)
    grandchildren.forEach(entry => process.kill(entry.pid))
    child.kill()
  }
})
