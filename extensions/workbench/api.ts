export const workbenchCommands = {
  newThread: "agent.new",
} as const;

export const workbenchEvents = {
  activityChanged: "workbench.activity.changed",
  newThreadSelected: "agent.new.selected",
  threadChanged: "workbench.thread.changed",
} as const;

export const workbenchSlots = {
  auxiliary: "workbench.auxiliary",
  bottom: "workbench.bottom",
  layoutActions: "workbench.layout.actions",
  overlays: "workbench.overlays",
  sidebarProjects: "workbench.sidebar.projects",
  topbarActions: "workbench.topbar.actions",
} as const;
