import type { CliValues } from '@sand/protocol'

export interface ProjectFlags {
  all?: boolean
  from?: string
  to?: string
  on?: string
  path?: string
  setup?: boolean
  ours?: boolean
  theirs?: boolean
}

const text = (value: CliValues[string]) => (typeof value === 'string' ? value : undefined)

const flag = (value: CliValues[string]) => (value === true ? true : undefined)

export const projectFlags = (values: CliValues): ProjectFlags => ({
  all: flag(values.all),
  from: text(values.from),
  to: text(values.to),
  on: text(values.on),
  path: text(values.path),
  setup: flag(values.setup),
  ours: flag(values.ours),
  theirs: flag(values.theirs),
})
