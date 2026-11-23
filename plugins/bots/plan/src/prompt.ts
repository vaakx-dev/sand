import { sectionLength } from '@sand/compaction/contract'

const HEADING = '## Your plan\n\nThe user reads and edits it.'

const SECTION_END = /\n<\/plan>|Your plan is empty so far\./

const contentsOf = (text: string) => (text.trim() ? `<plan>\n${text.trim()}\n</plan>` : 'Your plan is empty so far.')

const planSection = (text: string) => `${HEADING}\n\n${contentsOf(text)}`

const planSectionLength = (system: string) => sectionLength(system, HEADING, SECTION_END)

export { planSection, planSectionLength }
