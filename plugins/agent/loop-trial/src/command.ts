import type { Command, ReportRow, UI } from '@sand/server/contract'
import type { LoopTrial } from './contract'
import { checkLine, headline, keptLine } from './summary'

export const trialCommand = (ui: UI, trial: LoopTrial): Command => ({
  name: 'loop-trial',
  title: 'Loop trial',
  description: 'Test a draft loop plugin and install it when it passes',
  args: '<plugin>',
  async run(args) {
    const plugin = args.trim()
    if (!plugin) return ui.notify('Name the draft to test: /loop-trial <plugin>', 'error')
    const report = await trial.run(plugin, { parent: ui.session() })
    const kept = keptLine(report)
    const rows: ReportRow[] = [
      { kind: 'text', text: headline(report) },
      ...report.checks.map((check): ReportRow => ({ kind: 'text', text: checkLine(check) })),
      ...(kept ? [{ kind: 'text' as const, text: kept }] : []),
    ]
    ui.report(`Loop trial: ${plugin}`, rows)
  },
})
