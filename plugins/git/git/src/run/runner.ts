import type { GitRunner } from '../contract'
import { classify } from './classify'
import { problem, problemOf } from './error'
import { gitLines } from './lines'
import { remoteUrl } from './remote'
import { git, gitMaybe, gitOk } from './run'

export const runner: GitRunner = {
  run: git,
  ok: gitOk,
  maybe: gitMaybe,
  lines: gitLines,
  classify: (result, args) => problemOf(classify(result, args)),
  problem,
  remoteUrl,
}
