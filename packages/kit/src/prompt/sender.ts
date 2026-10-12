import type { Prompt, UserContent } from '@sand/messages'
import { promptContent } from './content'
import { noteBlock } from './feedback'

interface Sender {
  session: string
  name: string
}

export const senderSource = 'sender'

const senderNote = ({ session, name }: Sender) => noteBlock(senderSource, `This message comes from the agent in thread ${session} on ${name}, not from the user.`)

export const sentContent = (prompt: Prompt, from?: Sender): UserContent[] => [...(from ? [senderNote(from)] : []), ...promptContent(prompt)]
