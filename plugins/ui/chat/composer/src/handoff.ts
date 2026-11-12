import type { ComposerContent } from './contract'
import type { Model } from './model'

export const createHandoff = (model: Model, focusEnd: () => void) => ({
  async snapshot(): Promise<ComposerContent | undefined> {
    if (model.sending.get() || model.empty.get()) return undefined
    return model.content(model.draft())
  },
  restore({ text, content }: ComposerContent) {
    const typed = model.text.get().trim()
    model.records.add(content.flatMap(block => (block.type === 'context' ? block.records : [])))
    model.text.set(typed && text ? `${typed}\n\n${text}` : typed || text)
    model.attached.update(list => [...list, ...content.filter(block => block.type !== 'context')])
    focusEnd()
  },
  clear: model.clear,
})
