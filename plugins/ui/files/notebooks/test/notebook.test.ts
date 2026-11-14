import { expect, test } from 'bun:test'
import { parseNotebook } from '../src/web/notebook'

const png = (width: number, height: number) => {
  const bytes = new Uint8Array(33)
  const view = new DataView(bytes.buffer)
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52])
  view.setUint32(16, width)
  view.setUint32(20, height)
  return Buffer.from(bytes).toString('base64')
}

const notebook = (cells: unknown[]) => JSON.stringify({ nbformat: 4, nbformat_minor: 5, metadata: { kernelspec: { display_name: 'Python 3', language: 'python' } }, cells })

test('a notebook reads as its cells, with counts, saved outputs and the richest output each one can show', () => {
  const parsed = parseNotebook(
    notebook([
      { cell_type: 'markdown', source: ['# Orbit ', 'log'], metadata: {} },
      {
        cell_type: 'code',
        execution_count: 7,
        source: ['speed = 4.2\n', 'speed * 2'],
        metadata: {},
        outputs: [
          { output_type: 'stream', name: 'stdout', text: ['  \n'] },
          { output_type: 'stream', name: 'stderr', text: 'slow probe\n' },
          { output_type: 'execute_result', execution_count: 7, metadata: {}, data: { 'text/plain': ['8.4'] } },
          { output_type: 'display_data', metadata: {}, data: { 'text/html': ['<b>8.4</b>'], 'text/plain': '8.4' } },
          { output_type: 'error', ename: 'ValueError', evalue: 'no fuel', traceback: ['\u001b[0;31mValueError\u001b[0m: no fuel'] },
        ],
      },
    ]),
  )
  expect(parsed.kernel).toBe('Python 3')
  expect(parsed.language).toBe('python')
  expect(parsed.cells[0]).toMatchObject({ kind: 'markdown', source: '# Orbit log' })
  expect(parsed.cells[1]).toEqual({
    kind: 'code',
    source: 'speed = 4.2\nspeed * 2',
    count: 7,
    outputs: [
      { count: null, output: { kind: 'text', text: 'slow probe\n', stream: 'stderr' } },
      { count: 7, output: { kind: 'text', text: '8.4', stream: 'stdout' } },
      { count: null, output: { kind: 'html', html: '<b>8.4</b>', fallback: '8.4' } },
      { count: null, output: { kind: 'error', title: 'ValueError: no fuel', trace: 'ValueError: no fuel' } },
    ],
  })
})

test('an image too large to decode is refused from its header and falls back to its text, while a small one shows', () => {
  const output = (image: string) => ({ output_type: 'display_data', metadata: {}, data: { 'image/png': image, 'text/plain': '<Figure>' } })
  const [cell] = parseNotebook(notebook([{ cell_type: 'code', execution_count: 1, source: '', metadata: {}, outputs: [output(png(12_000, 12_000)), output(png(640, 480))] }])).cells
  expect(cell).toMatchObject({
    outputs: [
      { output: { kind: 'refused', note: 'A 12000 × 12000 image is too large to show', fallback: '<Figure>' } },
      { output: { kind: 'image', src: `data:image/png;base64,${png(640, 480)}` } },
    ],
  })
})

test('a notebook in an older format says which version can be shown', () => {
  expect(() => parseNotebook(JSON.stringify({ nbformat: 3, worksheets: [] }))).toThrow('Only version 4 notebooks can be shown')
})
