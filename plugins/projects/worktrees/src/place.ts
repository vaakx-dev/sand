import { expandHome } from '@sand/kit/fs'
import { existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { parse } from 'node:path'
import { branchExists } from './git/repo'

const featureOf = (branch: string) => branch.replace(/^sand\//, '').replace(/[\\/]+/g, '-')

export const locate = (template: string, main: string, repo: string, branch: string) => {
  const drive = process.platform === 'win32' ? parse(main).root : homedir()
  return expandHome(template.replaceAll('{drive}', drive).replaceAll('{repo}', repo).replaceAll('{name}', featureOf(branch)))
}

export const firstFree = async (wanted: string, free: (name: string) => Promise<boolean>) => {
  for (let tries = 1; tries < 100; tries++) {
    const name = tries === 1 ? wanted : `${wanted}-${tries}`
    if (await free(name)) return name
  }
  throw new Error(`No free name for ${wanted}`)
}

export const freePlace = async (template: string, main: string, repo: string, wanted: string) => {
  const branch = await firstFree(wanted, async name => !existsSync(locate(template, main, repo, name)) && !(await branchExists(main, name)))
  return { branch, path: locate(template, main, repo, branch) }
}
