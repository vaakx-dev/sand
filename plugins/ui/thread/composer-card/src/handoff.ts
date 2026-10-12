import type { ComposerContent } from './contract'
import type { Context } from 'drydock'
import type { Model } from './model'
import { sendDevice } from './send/submit'

export const createHandoff = (ctx: Context<'threads'>, model: Model, focusEnd: () => void) => ({
  async snapshot(): Promise<ComposerContent | undefined> {
    if (model.sending.get() || model.empty.get()) return undefined
    const content = await model.files.upload(sendDevice(ctx))
    return { text: model.text.get().trim(), content }
  },
  restore({ text, content }: ComposerContent) {
    const typed = model.text.get().trim()
    model.text.set(typed && text ? `${typed}\n\n${text}` : typed || text)
    model.files.attach(content)
    focusEnd()
  },
  clear: model.clear,
})
