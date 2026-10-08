import { join } from 'node:path'

const validId = /^[\w-]+$/
const pages = new Bun.Glob('*.html')

export interface RenderStore {
  write(html: string): Promise<{ id: string; path: string }>
  read(id: string): Promise<string>
  keep(ids: Set<string>): Promise<void>
}

export const renderStore = (dir: string): RenderStore => {
  const path = (id: string) => {
    if (!validId.test(id)) throw new Error(`Invalid render id: ${id}`)
    return join(dir, `${id}.html`)
  }
  return {
    async write(html) {
      const id = Bun.randomUUIDv7()
      await Bun.write(path(id), html)
      return { id, path: path(id) }
    },
    async read(id) {
      const file = Bun.file(path(id))
      if (!(await file.exists())) throw new Error('This render is no longer saved')
      return file.text()
    },
    async keep(ids) {
      const names = await Array.fromAsync(pages.scan({ cwd: dir, onlyFiles: true })).catch(() => [])
      const stale = names.filter(name => !ids.has(name.slice(0, -'.html'.length)))
      await Promise.all(stale.map(name => Bun.file(join(dir, name)).delete().catch(() => {})))
    },
  }
}
