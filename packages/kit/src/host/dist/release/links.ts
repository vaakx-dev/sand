import { workspacePackages } from './deps'
import { isLinkEntry, modulesFolder } from './manifest'

export const workspaceLinks = async (root: string): Promise<Record<string, string>> => {
  const links: Record<string, string> = {}
  for (const { name, path } of await workspacePackages(root)) {
    const link = `${modulesFolder}/${name}`
    if (!isLinkEntry(link, path)) throw new Error(`sand cannot link the workspace package ${name} at ${path}`)
    if (links[link]) throw new Error(`two workspace packages are named ${name}: ${links[link]} and ${path}`)
    links[link] = path
  }
  return links
}
