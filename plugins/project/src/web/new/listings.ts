import type { FolderListing } from '../../contract'
import type { ProjectsContext } from '../context'

export const listings = (ctx: ProjectsContext, device: string) => {
  const loaded = new Map<string, FolderListing>()
  const pending = new Map<string, Promise<FolderListing>>()
  return {
    get: (dir: string) => loaded.get(dir),
    load(dir: string) {
      const known = pending.get(dir)
      if (known) return known
      const request = ctx.projects.browse(dir, device).then(listing => {
        loaded.set(dir, listing)
        return listing
      })
      pending.set(dir, request)
      request.catch(() => pending.delete(dir))
      return request
    },
  }
}
