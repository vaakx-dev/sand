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

export const freePlace = async (template: string, main: string, repo: string, wanted: string) => {
  for (let tries = 1; tries < 100; tries++) {
    const branch = tries === 1 ? wanted : `${wanted}-${tries}`
    const path = locate(template, main, repo, branch)
    if (!existsSync(path) && !(await branchExists(main, branch))) return { branch, path }
  }
  throw new Error(`No free name for ${wanted}`)
}
