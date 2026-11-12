import { inspector } from '@sand/inspector/contract'
import type { Subject } from '@sand/ui-shell/contract'
import { pcs, pcsChange, wire, wireHello } from '@sand/devices-contract'
import { pulse } from '@sand/reactive'
import { toastsOf } from '@sand/toasts/contract'
import { kit } from '@sand/ui-kit/contract'
import { sig, span, stored } from '@vaakx-dev/vrui'
import { definePlugin } from 'drydock'
import { type Editor, editorOpen, editorsList } from '../contract'

const loopback = (host: string) => host === 'localhost' || host === '[::1]' || host.startsWith('127.')

export default definePlugin({
  name: 'inspector-editor',
  description: "The inspector's editor row: opens the thread's folder in an editor, the file manager or a terminal",
  inject: { inspector, kit, pcs, wire },
  apply(ctx) {
    const onThisPc = loopback(location.hostname)
    const home = pulse(ctx, [pcsChange]).read(() => ctx.pcs.here().id)
    const editors = sig<Editor[]>([])
    const picked = stored('sand.editor', '')
    let asked: string | undefined
    const notices = toastsOf(ctx)

    const load = (device: string) => {
      asked = device
      ctx.wire.call(editorsList, {}, device).then(
        found => editors.set(found),
        () => {},
      )
    }
    const opens = (subject: Subject) => onThisPc && Boolean(subject.cwd) && subject.device === home.get()
    const shows = (subject: Subject) => {
      if (!opens(subject)) return false
      if (asked === undefined) load(subject.device)
      return editors.get().length > 0
    }
    const current = () => editors.get().find(editor => editor.id === picked.get()) ?? editors.get()[0]
    const open = ({ device, cwd = '' }: Subject, editor: Editor) => {
      picked.set(editor.id)
      ctx.wire.call(editorOpen, { cwd, editor: editor.id }, device).catch(error => notices.error(`Couldn't open the folder in ${editor.label}`, error))
    }

    ctx.on(wireHello, () => {
      if (asked !== undefined) load(asked)
    })
    ctx.effect(() =>
      ctx.inspector.row({
        id: 'editor',
        group: 'place',
        order: 20,
        shows,
        render: subject =>
          ctx.kit.dropdown({
            menuClass: 'right-1 left-8 w-auto',
            trigger: (press, isOpen) =>
              ctx.kit.cardItem(
                { ...press, 'aria-expanded': () => String(isOpen.get()), lead: ctx.kit.icon('external', 'sm'), menu: true },
                () => `Open in ${current()?.label ?? ''}`,
              ),
            items: close =>
              editors.get().map(editor =>
                ctx.kit.choiceItem(
                  {
                    selected: () => current()?.id === editor.id,
                    onClick: () => {
                      close()
                      open(subject(), editor)
                    },
                  },
                  span({ class: 'flex-1 truncate' }, editor.label),
                ),
              ),
          }),
      }),
    )
  },
})
