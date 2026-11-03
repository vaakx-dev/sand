import { oneLine } from '@sand/util'
import type { Message } from '../contract'
import { promptText } from './user'

const titleLength = 48

export const quickTitle = (message: Message) => (message.role === 'user' ? oneLine(promptText(message), titleLength) : '')
