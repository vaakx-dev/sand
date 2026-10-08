import type { RemoteClient, WireEvent } from '@sand/protocol'
import type { Follower } from '../follow/follower'
import type { RemoteModels } from './models'

export const followRemote = (client: RemoteClient, follower: Follower, models: RemoteModels) =>
  client.listen((name, args) => {
    const event = { name, args } as WireEvent
    switch (event.name) {
      case 'llm.event':
        return follower.llmEvent(event.args[0], event.args[1].$session.id)
      case 'tool.start':
        return follower.toolStart(event.args[0], event.args[1].$session.id)
      case 'tool.result':
        return follower.toolResult(event.args[0], event.args[2].$session.id)
      case 'artifact.saved':
        return follower.artifact(event.args[0].$session.id, event.args[1])
      case 'settings.change':
        return models.seen(...event.args)
      case 'context.change':
        return follower.context(...event.args)
      case 'llm.limits':
        return follower.limits(event.args[0])
      case 'turn.start':
        return follower.turnStart(event.args[0].$session.id)
      case 'turn.continue':
        return follower.turnContinue(event.args[0].$session.id, event.args[1])
      case 'turn.end':
        return follower.turnEnd(event.args[0].$session.id, event.args[1])
      case 'agent.start':
        return follower.agentStart(event.args[0].$session)
      case 'agent.end':
        return follower.agentEnd(event.args[0].$session, event.args[1])
      case 'job.start':
        return follower.jobStart(event.args[0].$job)
      case 'job.end':
        return follower.jobEnd(event.args[0].$job)
    }
  })
