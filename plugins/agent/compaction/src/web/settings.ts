import { wire, wireHello } from '@sand/devices-contract'
import { settings } from '@sand/settings/contract'
import { toastsOf } from '@sand/toasts/contract'
import type { kit, Kit } from '@sand/ui-kit/contract'
import { sig, type Sig } from '@vaakx-dev/vrui'
import type { Context } from 'drydock'
import { helloIdleShares, idleShareChoices, type IdleShares, idleSharesChange, idleSharesSet } from '../contract'

type SettingsContext = Context<{ wire: typeof wire; kit: typeof kit }>

interface Row {
  kind: keyof IdleShares
  title: string
  detail: string
}

const ROWS: Row[] = [
  { kind: 'bot', title: 'Idle bots', detail: 'A bot left idle compacts just before its prompt cache runs out, once its context reaches this share of the compaction limit.' },
  { kind: 'thread', title: 'Idle threads', detail: 'The same for threads. Agent and quick chats never compact while idle.' },
]

const percent = (share: number) => `${Math.round(share * 100)}%`

const idlePage = (kit: Kit, shares: Sig<IdleShares | undefined>, choose: (next: IdleShares) => void) =>
  kit.settingsSection(
    {},
    ...ROWS.map(({ kind, title, detail }) =>
      kit.settingsRow(
        { title, detail },
        kit.segmented(
          idleShareChoices.map(value => ({ value, label: percent(value) })),
          () => shares.get()?.[kind],
          value => {
            const current = shares.get()
            if (current) choose({ ...current, [kind]: value })
          },
          { label: title },
        ),
      ),
    ),
  )

export const idleSettings = (ctx: SettingsContext) => {
  const shares = sig<IdleShares | undefined>(undefined)
  const greeted = () => shares.set(ctx.wire.hello(helloIdleShares))
  const choose = (next: IdleShares) =>
    void toastsOf(ctx).attempt('Couldn’t change when idle chats compact', () => ctx.wire.call(idleSharesSet, next).then(saved => shares.set(saved)))
  ctx.on(wireHello, greeted)
  if (ctx.wire.ready()) greeted()
  ctx.effect(() => ctx.wire.on(idleSharesChange, next => shares.set(next)))
  ctx.watch(settings, found =>
    found?.page({
      id: 'compaction',
      label: 'Compaction',
      icon: 'archive',
      group: 'agents',
      order: 25,
      render: () => idlePage(ctx.kit, shares, choose),
    }),
  )
}
