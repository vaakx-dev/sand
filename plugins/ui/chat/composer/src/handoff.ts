import type { ComposerContext } from './context'
import type { ComposerContent } from './contract'
import type { Model } from './model'
import { sendDevice } from './send/submit'

export const createHandoff = (ctx: ComposerContext, model: Model, focusEnd: () => void) => ({
  async snapshot(): Promise<ComposerContent | undefined> {
    if (model.sending.get() || model.empty.get()) return undefined
    const content = await model.files.upload(sendDevice(ctx))
    const text = model.text.get().trim()
    return { text, content: [...content, ...model.records.content(text)] }
  },
  restore({ text, content }: ComposerContent) {
    const typed = model.text.get().trim()
    model.records.add(content.flatMap(block => (block.type === 'context' ? block.records : [])))
    model.text.set(typed && text ? `${typed}\n\n${text}` : typed || text)
    model.files.attach(content.filter(block => block.type !== 'context'))
    focusEnd()
  },
  clear: model.clear,
})
