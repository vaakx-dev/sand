import { definitionsIn, type FeatureDefinition, featureOf } from '@sand/config/contract'
import { isRecord } from '@sand/util'
import { readManifest, workspacePackages } from '@sand/util/release'

interface Workspace {
  name: string
  dir: string
  path: string
  dependencies: string[]
}

interface Addon {
  id: string
  label: string
  summary: string
  needs: string[]
  packages: Workspace[]
}

interface Split {
  core: Workspace[]
  addons: Addon[]
}

const sandOf = async (workspace: Workspace) => {
  const sand = (await readManifest(workspace.dir))?.sand
  return isRecord(sand) ? sand : {}
}

const rootFinder = (definitions: FeatureDefinition[]) => {
  const byId = new Map(definitions.map(definition => [definition.id, definition]))
  const rootOf = (id: string | undefined): string | undefined => {
    const definition = id === undefined ? undefined : byId.get(id)
    if (!definition) return undefined
    return definition.addon ? definition.id : rootOf(definition.parent)
  }
  return rootOf
}

const addonOf = (root: FeatureDefinition, definitions: FeatureDefinition[], rootOf: (id: string) => string | undefined) => {
  const own = definitions.filter(definition => rootOf(definition.id) === root.id)
  const needed = new Set(own.flatMap(definition => definition.needs.flatMap(need => rootOf(need) ?? [])))
  needed.delete(root.id)
  return { id: root.id, label: root.label, summary: root.summary, needs: [...needed].sort() }
}

const splitWorkspace = async (root: string): Promise<Split> => {
  const workspaces = await workspacePackages(root)
  const manifests = await Promise.all(workspaces.map(sandOf))
  const definitions = definitionsIn(manifests)
  const rootOf = rootFinder(definitions)
  const owners = manifests.map(sand => rootOf(featureOf(sand)))
  const addons = definitions
    .filter(definition => definition.addon)
    .map(definition => ({ ...addonOf(definition, definitions, rootOf), packages: workspaces.filter((_, index) => owners[index] === definition.id) }))
  return { core: workspaces.filter((_, index) => !owners[index]), addons: addons.toSorted((a, b) => a.id.localeCompare(b.id)) }
}

export { splitWorkspace, type Addon, type Workspace }
