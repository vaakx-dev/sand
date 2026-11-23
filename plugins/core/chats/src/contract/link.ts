const threadScheme = 'thread'

const threadLink = (thread: string, title: string) => `[${title}](${threadScheme}:${thread})`

const threadLinkNote = (thread: string, title: string) =>
  `Link for the user: ${threadLink(thread, title)}. Put it on its own line when you tell them about this thread.`

export { threadLinkNote, threadScheme }
