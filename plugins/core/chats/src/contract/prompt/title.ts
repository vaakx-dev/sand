import { oneLine } from '@sand/util'
import type { Message } from '..'
import { linkLabels } from './label'
import { promptText } from './user'

const titleLength = 48

export const quickTitle = (message: Message) => (message.role === 'user' ? oneLine(linkLabels(promptText(message)), titleLength) : '')
