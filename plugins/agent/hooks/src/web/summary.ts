import type { HookRecord } from '../contract'

export const fileName = (source: string) => source.split('/').pop() ?? source

const toolName = (detail?: string) => detail?.split(':')[0] ?? 'a tool'

export const action = (record: HookRecord) => {
  switch (record.outcome) {
    case 'allowed':
    case 'denied':
    case 'rewritten':
      return `${record.outcome} ${toolName(record.detail)}`
    case 'asked':
      return `asked before ${toolName(record.detail)}`
    case 'decided':
      return record.hook === 'model.choose' && record.detail ? `chose ${record.detail}` : `decided ${record.hook}`
    case 'changed':
      return `changed ${record.hook}`
    case 'skipped':
      return `skipped ${record.hook} (too slow)`
    case 'failed':
      return `failed in ${record.hook}`
  }
}

export const summary = (records: HookRecord[]) => records.map(record => `${fileName(record.source)} ${action(record)}`).join(' · ')
