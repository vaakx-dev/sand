import {
  compareActiveThreads,
  comparePinnedThreads,
  compareSettledThreads,
  compareSnoozedThreads,
  threadSection,
  type AgentThreadSummary,
  type ThreadLifecycleOptions,
} from "@sand/extension-api";

export interface ThreadGroups {
  matching: AgentThreadSummary[];
  pinned: AgentThreadSummary[];
  active: AgentThreadSummary[];
  snoozed: AgentThreadSummary[];
  settled: AgentThreadSummary[];
}

export interface ThreadGroupOptions extends ThreadLifecycleOptions {
  query: string;
}

export function groupThreads(
  threads: AgentThreadSummary[],
  options: ThreadGroupOptions,
): ThreadGroups {
  const query = options.query.trim().toLowerCase();
  const matching = query
    ? threads.filter((thread) => thread.title.toLowerCase().includes(query))
    : [...threads];
  const groups: ThreadGroups = {
    matching,
    pinned: [],
    active: [],
    snoozed: [],
    settled: [],
  };

  for (const thread of matching) groups[threadSection(thread, options)].push(thread);
  groups.pinned.sort(stable(comparePinnedThreads));
  groups.active.sort(stable(compareActiveThreads));
  groups.snoozed.sort(stable(compareSnoozedThreads));
  groups.settled.sort(stable(compareSettledThreads));
  return groups;
}

function stable(
  compare: (left: AgentThreadSummary, right: AgentThreadSummary) => number,
): (left: AgentThreadSummary, right: AgentThreadSummary) => number {
  return (left, right) => compare(left, right) || left.id.localeCompare(right.id);
}
