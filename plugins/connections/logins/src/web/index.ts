import { botViews } from '@sand/bots/contract'
import { wire, wireHello } from '@sand/devices-contract'
import { settings } from '@sand/settings/contract'
import { toolViews, transcript } from '@sand/transcript/contract'
import { kit } from '@sand/ui-kit/contract'
import { joinDisposers } from '@sand/util'
import { threads } from '@sand/web-client/contract'
import { div } from '@vaakx-dev/vrui'
import { definePlugin } from 'drydock'
import { answerEntry, codeEntry, loginsWire, secretEntry, type AskAnswer, type CodeRequest, type SecretRequest } from '../contract'
import { answerBook } from './cards/ask'
import { codeCard } from './cards/code'
import { secretCard } from './cards/secret'
import { toolSteps } from './cards/steps'
import { loginsModel } from './page/model'
import { loginsPages } from './page/pages'

export default definePlugin({
  name: 'logins-web',
  description: "Logins page in settings, and the chat cards where you hand the agent a password or a sign-in code without it seeing them",
  inject: { wire, kit, toolViews },
  apply(ctx) {
    const model = loginsModel(ctx.wire)
    const load = () => model.load().catch((error: unknown) => ctx.report(error))
    ctx.on(wireHello, () => void load())
    if (ctx.wire.ready()) void load()
    ctx.effect(() => ctx.wire.on(loginsWire, value => model.state.set(value)))
    ctx.watch(settings, found => found && loginsPages(found, { kit: ctx.kit, wire: ctx.wire, threads: () => ctx.get(threads), model, bots: () => ctx.get(botViews) !== undefined }))

    const answers = answerBook()
    const steps = Object.entries(toolSteps(ctx.toolViews, id => model.find(id)?.name))
    ctx.watch(
      transcript,
      found =>
        found &&
        joinDisposers(
          ...steps.map(([name, step]) => found.tool(name, step)),
          found.entry(secretEntry, (entry, conversation) => {
            const request = entry.data as SecretRequest
            return secretCard(ctx, answers.of(request.id), conversation, request)
          }),
          found.entry(codeEntry, (entry, conversation) => {
            const request = entry.data as CodeRequest
            return codeCard(ctx, answers.of(request.id), conversation, request)
          }),
          found.entry(answerEntry, entry => div({ onMount: () => answers.record(entry.data as AskAnswer) })),
        ),
    )
  },
})
