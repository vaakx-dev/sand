const contentsOf = (text: string) => (text.trim() ? `<plan>\n${text.trim()}\n</plan>` : 'Your plan is empty so far.')

const planSection = (text: string) => `## Your plan

What's happening in your work, what's next and what's blocked. The user reads it to see where your work stands and can edit it; their edits show here. Rewrite it with bot_plan_write; after you do, your latest write is your plan. When an item is done, take it out of the plan and log it in the Logbook with logbook_add. The user's decisions and what never goes stale go in your memory, and what you can look up, like PRs, commits and chats, gets a link, not a copy.

${contentsOf(text)}`

export { planSection }
