import type { GitRunner } from '@sand/git/contract'
import { existsSync } from 'node:fs'
import { basename, join } from 'node:path'
import { branchExists, validBranch } from '../repo/refs'

const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789'
const idLength = 6
const mostTries = 20

const shortId = () => Array.from(crypto.getRandomValues(new Uint8Array(idLength)), byte => alphabet.charAt(byte % alphabet.length)).join('')

export interface Place {
  path: string
  branch: string
}

export const freePlace = async (git: GitRunner, folder: string, main: string, prefix: string): Promise<Place> => {
  for (let tries = 0; tries < mostTries; tries++) {
    const id = shortId()
    const place = { path: join(folder, basename(main), id), branch: `${prefix}${id}` }
    if (existsSync(place.path) || (await branchExists(git, main, place.branch))) continue
    if (!(await validBranch(git, main, place.branch))) throw new Error(`"${prefix}" can't start a branch name; change prefix under [plugins.worktrees].`)
    return place
  }
  throw new Error(`Couldn't find a free folder in ${join(folder, basename(main))}.`)
}
