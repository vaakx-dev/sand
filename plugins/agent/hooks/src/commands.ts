import type { ReportRow, UI } from '@sand/server/contract'
import type { Inspector, TraceRecord } from 'drydock'
import { basename } from 'node:path'
import type { HookFileState } from './contract'
import type { HooksRuntime } from './start'
import { isHookName } from './wrap/args'

const traceLimit = 50

const statusText = (file: HookFileState) => {
  if (file.status === 'failed') return `failed${file.error ? `: ${file.error}` : ''}`
  if (file.status !== 'active' && file.status !== 'off') return file.status
  const hooks = file.hooks.map(hook => (hook.off ? `${hook.name} (off, ${hook.off})` : hook.name))
  return [file.status, ...hooks].join(' · ')
}

const fileRows = (files: HookFileState[]): ReportRow[] =>
  files.length
    ? files.map(file => ({ kind: 'pair', label: `${file.scope === 'home' ? 'home' : basename(file.folder)}/${basename(file.path)}`, value: statusText(file) }))
    : [{ kind: 'text', text: 'No hook files. Add .ts files to the hooks folder in your sand home or to .sand/hooks in a project.' }]

const time = (at: number) => new Date(at).toTimeString().slice(0, 8)

const traceRow = (record: TraceRecord): ReportRow => {
  const failed = record.failed.length ? ` · failed: ${record.failed.join(', ')}` : ''
  const handlers = record.handlers.length ? record.handlers.join(', ') : 'no handlers'
  return { kind: 'text', mono: true, text: `${time(record.at)} ${record.name} ${record.kind} ${record.ms.toFixed(1)} ms · ${handlers}${failed}` }
}

const traceRows = (inspector: Inspector | undefined): ReportRow[] => {
  if (!inspector) return [{ kind: 'text', text: 'The inspector is not running, so there are no timings.' }]
  const records = inspector
    .trace()
    .filter(record => isHookName(record.name))
    .slice(-traceLimit)
  return records.length ? records.map(traceRow) : [{ kind: 'text', text: 'No hook moments have run yet.' }]
}

export const hooksCommand = (ui: UI, runtime: HooksRuntime | undefined, inspector: () => Inspector | undefined) =>
  ui.command({
    name: 'hooks',
    title: 'Hooks',
    description: 'Show hook files and their status, or recent hook timings',
    args: '[trace]',
    async run(args) {
      if (args.trim() === 'trace') return ui.report('Hook trace', traceRows(inspector()))
      if (!runtime) return ui.report('Hooks', [{ kind: 'text', text: 'Hooks are off in safe mode. No hook files are loaded.' }])
      await runtime.scan(ui.session()?.cwd ?? ui.cwd())
      ui.report('Hooks', fileRows(runtime.service.files()))
    },
  })
