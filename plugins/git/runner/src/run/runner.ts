import type { GitRunner } from '../contract'
import { classify } from './classify'
import { commits } from './commits'
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
  commits,
  classify: (result, args, what) => problemOf(classify(result, args, what)),
  problem,
  remoteUrl,
  withTempIndex,
}
