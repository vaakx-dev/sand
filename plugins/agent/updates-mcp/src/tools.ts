import { type UpdateChannel, updatesApply, updatesChannel, updatesCheck, updatesLater, updatesRestart, updatesState } from '@sand/host-updates/contract'
import type { McpGroup, McpTool, McpTools } from '@sand/mcp-server/contract'
import { joinDisposers } from '@sand/util'
import { z } from 'zod'

const group: McpGroup = { name: 'updates', label: 'sand updates', summary: 'see whether a newer sand is out, install it on your PCs and restart into it' }

const pc = z.string().min(1).optional().describe('Another of your PCs, by name (default: this PC)')

const onPc = z.object({ pc })

const installInput = onPc.extend({ build: z.string().min(1).describe("The build id to install: latest.build.id from update_status") })

const channelInput = onPc.extend({ channel: z.enum(['release', 'nightly', 'dev'] satisfies UpdateChannel[]).describe('release: stable releases; nightly: daily builds; dev: every change') })

const stateNote = 'Returns the update state: the running build, the newest release, whether it is available, and the install phase.'

const onOtherPcs = { feature: 'pcs', fields: ['pc' as const] }

const tools = [
  {
    name: 'update_status',
    description: `See which sand build a PC runs and whether a newer one is out. ${stateNote}`,
    input: onPc,
    parts: [onOtherPcs],
    access: 'read',
    group: group.name,
    run: (input, { call }) => call(updatesState, input),
  } satisfies McpTool<typeof onPc>,
  {
    name: 'update_check',
    description: `Ask GitHub for the newest sand release now. ${stateNote}`,
    input: onPc,
    parts: [onOtherPcs],
    access: 'read',
    group: group.name,
    run: (input, { call }) => call(updatesCheck, input),
  } satisfies McpTool<typeof onPc>,
  {
    name: 'update_install',
    description: `Download and install a newer sand build, then restart into it once running threads finish. It returns at once; follow the phase with update_status. ${stateNote}`,
    input: installInput,
    parts: [{ ...onOtherPcs, description: 'Update other PCs before this one, since this PC restarts.' }],
    access: 'operate',
    group: group.name,
    run: (input, { call }) => call(updatesApply, input),
  } satisfies McpTool<typeof installInput>,
  {
    name: 'update_restart',
    description: `Restart into an installed update now instead of waiting for running threads to finish. Those threads stop, you too if you run on that PC. ${stateNote}`,
    input: onPc,
    parts: [onOtherPcs],
    access: 'operate',
    group: group.name,
    run: (input, { call }) => call(updatesRestart, input),
  } satisfies McpTool<typeof onPc>,
  {
    name: 'update_later',
    description: `Skip the newest release: stop offering it until a newer one is out. ${stateNote}`,
    input: onPc,
    parts: [onOtherPcs],
    access: 'operate',
    group: group.name,
    run: (input, { call }) => call(updatesLater, input),
  } satisfies McpTool<typeof onPc>,
  {
    name: 'update_channel',
    description: `Choose which releases a PC follows, and check that channel. ${stateNote}`,
    input: channelInput,
    parts: [onOtherPcs],
    access: 'operate',
    group: group.name,
    run: (input, { call }) => call(updatesChannel, input),
  } satisfies McpTool<typeof channelInput>,
]

const offerUpdateTools = (registry: McpTools) => joinDisposers(registry.group(group), ...tools.map(tool => registry.register(tool)))

export { offerUpdateTools, tools }
