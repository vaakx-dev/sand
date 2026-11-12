import { sectionLength } from '@sand/compaction/contract'

const HEADING = "## Your plan\n\nWhat's happening in your work, what's next and what's blocked."

const SECTION_END = /\n<\/plan>|Your plan is empty so far\./

const contentsOf = (text: string) => (text.trim() ? `<plan>\n${text.trim()}\n</plan>` : 'Your plan is empty so far.')

const doneRule = 'When an item is done, take it out of the plan.'

const planSection = (text: string, done: string) => `${HEADING} The user reads it to see where your work stands and can edit it; their edits show here. Rewrite it with bot_plan_write; after you do, your latest write is your plan. ${done} The user's decisions and what never goes stale go in your memory, and what you can look up, like PRs, commits and chats, gets a link, not a copy.

${contentsOf(text)}`

const planSectionLength = (system: string) => sectionLength(system, HEADING, SECTION_END)

export { doneRule, planSection, planSectionLength }
