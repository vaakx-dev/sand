import type { GitRunner } from '../contract'
import { classify } from './classify'
import { problem, problemOf } from './error'
import { gitLines } from './lines'
import { remoteUrl } from './remote'
import { git, gitMaybe, gitOk, gitOutput } from './run'
import { withTempIndex } from './temp-index'

export const runner: GitRunner = {
  run: git,
  ok: gitOk,
  output: gitOutput,
  maybe: gitMaybe,
  lines: gitLines,
  classify: (result, args, what) => problemOf(classify(result, args, what)),
  problem,
  remoteUrl,
  withTempIndex,
}
