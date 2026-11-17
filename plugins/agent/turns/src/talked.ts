const talkedBackfill = [
  [
    `update chats set talked = coalesce((select max(started) from turns where owner = case chats.kind when 'bot' then 'bot' else 'thread' end
      and conversation = chats.id and origin = 'user'), created)`,
  ],
]

export { talkedBackfill }
