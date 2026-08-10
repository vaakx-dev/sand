import {
  compareActiveThreads,
  comparePinnedThreads,
  compareSettledThreads,
  compareSnoozedThreads,
  threadSection,
  type AgentSessionSummary,
  type ThreadLifecycleOptions,
} from "@sand/extension-api";

export interface ThreadGroups {
  matching: AgentSessionSummary[];
  pinned: AgentSessionSummary[];
  active: AgentSessionSummary[];
  snoozed: AgentSessionSummary[];
  settled: AgentSessionSummary[];
}

export interface ThreadGroupOptions extends ThreadLifecycleOptions {
  query: string;
}

export function groupThreads(
  sessions: AgentSessionSummary[],
  options: ThreadGroupOptions,
): ThreadGroups {
  const query = options.query.trim().toLowerCase();
  const matching = query
    ? sessions.filter((session) => session.title.toLowerCase().includes(query))
    : [...sessions];
  const groups: ThreadGroups = {
    matching,
    pinned: [],
    active: [],
    snoozed: [],
    settled: [],
  };

  for (const session of matching) groups[threadSection(session, options)].push(session);
  groups.pinned.sort(stable(comparePinnedThreads));
  groups.active.sort(stable(compareActiveThreads));
  groups.snoozed.sort(stable(compareSnoozedThreads));
  groups.settled.sort(stable(compareSettledThreads));
  return groups;
}

function stable(
  compare: (left: AgentSessionSummary, right: AgentSessionSummary) => number,
): (left: AgentSessionSummary, right: AgentSessionSummary) => number {
  return (left, right) => compare(left, right) || left.id.localeCompare(right.id);
}
