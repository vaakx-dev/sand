import type { Caller } from '@sand/host-hub/contract'
import type { Server } from '@sand/server/contract'
import { joinDisposers } from '@sand/util'
import {
  helloQuestions,
  type Mode,
  type Permissions,
  permissionAnswer,
  permissionDeadline,
  permissionMode,
  permissionModeSet,
  permissionRuleRemove,
  permissionSettings,
  strictness,
} from './contract'

const loosening = (permissions: Permissions, { owner, id }: { owner: 'thread' | 'bot'; id: string }, mode: Mode) =>
  strictness[mode] < strictness[permissions.mode({ owner, id }).mode]

const checkLoosening = (permissions: Permissions, input: { owner: 'thread' | 'bot'; id: string; mode: Mode }, caller: Caller) => {
  if (caller.actor && loosening(permissions, input, input.mode)) throw new Error('Only the user can loosen permissions; ask them to change it in sand')
}

export const servePermissions = (server: Server, permissions: Permissions) =>
  joinDisposers(
    server.hello(helloQuestions, permissions.questions),
    server.handle(permissionAnswer, ({ id, answer }) => permissions.answer(id, answer)),
    server.handle(permissionMode, conversation => permissions.mode(conversation)),
    server.handle(permissionModeSet, (input, caller) => {
      checkLoosening(permissions, input, caller)
      const { mode, ...conversation } = input
      return permissions.setMode(conversation, mode)
    }),
    server.handle(permissionSettings, permissions.settings),
    server.handle(permissionRuleRemove, ({ id }) => {
      permissions.removeRule(id)
      return permissions.settings()
    }),
    server.handle(permissionDeadline, ({ minutes }) => {
      permissions.setDeadline(minutes)
      return permissions.settings()
    }),
  )
