import type { Request } from '@sand/host-hub/contract'
import { tildeHome } from '@sand/util'
import { projectRows, projectUpdate, type ProjectPatch, type ProjectRow } from '../contract'

type Call = <I, O>(request: Request<I, O>, input: I) => Promise<O>

type Action = (call: Call) => Promise<number>

type Change = 'pin' | 'unpin' | 'archive' | 'unarchive'

const PATCHES: Record<Change, ProjectPatch> = {
  pin: { pinned: true },
  unpin: { pinned: false },
  archive: { archived: true },
  unarchive: { archived: false },
}

type Standing = 'pinned' | 'archived' | ''

const RANKS: Record<Standing, number> = { pinned: 0, '': 1, archived: 2 }

const standing = (row: ProjectRow): Standing => {
  if (row.pinned) return 'pinned'
  if (row.archived) return 'archived'
  return ''
}

const print = (rows: ProjectRow[], json: boolean) => {
  if (json) return console.log(JSON.stringify(rows))
  const cells = rows.map(row => [row.name, standing(row), row.folder ? tildeHome(row.folder) : ''])
  const widths = [0, 1].map(column => Math.max(0, ...cells.map(cell => cell[column]!.length)))
  for (const cell of cells) console.log(cell.map((text, column) => text.padEnd(widths[column] ?? 0)).join('  ').trimEnd())
}

const named = (rows: ProjectRow[], asked: string) => {
  const byId = rows.find(row => row.project === asked)
  if (byId) return byId
  const byName = rows.filter(row => row.name.toLowerCase() === asked.toLowerCase())
  if (byName.length > 1) throw new Error(`${byName.length} projects are called ${asked}; use its id from sand project list --json`)
  if (!byName[0]) throw new Error(`No project called ${asked}`)
  return byName[0]
}

const list =
  (json: boolean): Action =>
  async call => {
    const rows = await call(projectRows, {})
    print(rows.toSorted((a, b) => RANKS[standing(a)] - RANKS[standing(b)]), json)
    return 0
  }

const change =
  (asked: string, patch: ProjectPatch, json: boolean): Action =>
  async call => {
    const { project } = named(await call(projectRows, {}), asked)
    const row = await call(projectUpdate, { project, ...patch })
    print([row], json)
    return 0
  }

const isChange = (name: string): name is Change => Object.hasOwn(PATCHES, name)

export const projectAction = ([name = '', ...args]: string[], json: boolean): Action | undefined => {
  if (name === 'list' && !args.length) return list(json)
  if (isChange(name) && args.length === 1) return change(args[0]!, PATCHES[name], json)
  return undefined
}
