import { errorMessage } from '@sand/kit'
import type { Session } from '@sand/sessions-sqlite/contract'
import { join } from 'node:path'
import type { TrialContext } from './context'
import type { LoopTrial, TrialCheck, TrialReport } from './contract'
import { installDraft } from './draft/install'
import { linkDependencies } from './draft/links'
import { loadDraft, type LoadedDraft } from './draft/load'
import { readManifest } from './draft/manifest'
import { draftsDir, shortPath, validName } from './draft/paths'
import { namesCheck } from './run/checks'
import { removeTrialThread, trialTurn } from './run/turn'

const runLoops = async (ctx: TrialContext, draft: LoadedDraft, parent?: Session) => {
  const checks: TrialCheck[] = []
  let kept: string | undefined
  const prefix = draft.loops.length > 1
  for (const impl of draft.loops) {
    const turn = await trialTurn(ctx, impl, parent)
    checks.push(...turn.checks.map(check => (prefix ? { ...check, name: `${impl.name}: ${check.name}` } : check)))
    if (turn.checks.every(check => check.ok)) await removeTrialThread(ctx, turn.session)
    else kept ??= turn.session.id
  }
  return { checks, kept }
}

export const createTrial = (ctx: TrialContext): LoopTrial => ({
  async run(plugin, options = {}) {
    const report: TrialReport = { ok: false, plugin, loops: [], checks: [], applied: false }
    const fail = (error: string) => ({ ...report, error })
    if (!validName(plugin)) return fail(`"${plugin}" is not a plugin folder name`)
    const home = ctx.cli.home
    const dir = join(draftsDir(home), plugin)
    const manifest = await readManifest(dir)
    if (!manifest) return fail(`There is no draft with a package.json at ${shortPath(dir)}. Copy the plugin folder there first.`)
    if (!manifest.loops.length) return fail(`${shortPath(dir)}/package.json has no "sand": { "loops": [...] } list naming the loops it registers.`)
    await linkDependencies(dir, manifest.dependencies)
    const draft = await loadDraft(ctx, dir).catch((error: unknown) => errorMessage(error))
    if (typeof draft === 'string') return fail(draft)
    try {
      report.loops = draft.loops.map(loop => loop.name)
      if (!draft.loops.length) return fail('The plugin started but registered no loops.')
      const { checks, kept } = await runLoops(ctx, draft, options.parent)
      report.checks = [namesCheck(manifest.loops, report.loops), ...checks]
      if (kept) report.session = kept
    } finally {
      await draft.dispose()
    }
    report.ok = report.checks.every(check => check.ok)
    if (!report.ok || options.apply === false) return report
    try {
      await installDraft(home, plugin)
      report.applied = true
    } catch (error) {
      report.error = `It passed, but installing it failed: ${errorMessage(error)}`
    }
    return report
  },
})
