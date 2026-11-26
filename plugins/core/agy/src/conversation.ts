import { homedir } from 'node:os'
import { join } from 'node:path'

const DATABASE_SUFFIX = '.db'

function conversationsFolder(folder?: string): string {
  return join(folder ?? join(homedir(), '.gemini'), 'antigravity-cli', 'conversations')
}

function conversationFile(folder: string | undefined, session: string): string {
  return join(conversationsFolder(folder), session + DATABASE_SUFFIX)
}

export { conversationFile, conversationsFolder, DATABASE_SUFFIX }
