use std::collections::HashMap;

use serde_json::Value;

use super::Event;

#[derive(Default)]
pub(super) struct Projection {
    pub(super) threads: HashMap<String, Value>,
    pub(super) runs: HashMap<String, Value>,
    pub(super) attempts: HashMap<String, Value>,
    pub(super) acp_agents: HashMap<String, Value>,
    pub(super) acp_sessions: HashMap<String, Value>,
}

pub(super) fn apply(projection: &mut Projection, event: &Event) {
    match event.kind.as_str() {
        "thread.saved" => save(&mut projection.threads, &event.payload, "thread"),
        "thread.title_updated" => update_title(projection, &event.payload),
        "thread.deleted" => delete_thread(projection, &event.payload),
        "message.appended" => {
            save(&mut projection.threads, &event.payload, "thread");
            append_message(projection, &event.payload);
        }
        kind if kind.starts_with("run.") => {
            save(&mut projection.threads, &event.payload, "thread");
            save(&mut projection.runs, &event.payload, "run");
            save(&mut projection.attempts, &event.payload, "attempt");
        }
        kind if kind.starts_with("attempt.") => {
            save(&mut projection.threads, &event.payload, "thread");
            save(&mut projection.runs, &event.payload, "run");
            save(&mut projection.attempts, &event.payload, "attempt");
        }
        kind if kind.starts_with("turn.") => {
            save(&mut projection.threads, &event.payload, "thread");
        }
        kind if kind.starts_with("acp.agent.") => {
            save(&mut projection.acp_agents, &event.payload, "agent")
        }
        kind if kind.starts_with("acp.session.") || kind.starts_with("acp.prompt.") => {
            save(&mut projection.acp_sessions, &event.payload, "session")
        }
        _ => {}
    }
}

fn save(values: &mut HashMap<String, Value>, payload: &Value, key: &str) {
    let Some(value) = payload.get(key).cloned() else {
        return;
    };
    let Some(id) = owned_field(&value, "id") else {
        return;
    };
    values.insert(id, value);
}

fn delete_thread(projection: &mut Projection, payload: &Value) {
    let Some(thread_id) = field(payload, "threadId") else {
        return;
    };
    projection.threads.remove(thread_id);
    projection
        .runs
        .retain(|_, run| field(run, "threadId") != Some(thread_id));
    projection
        .attempts
        .retain(|_, attempt| field(attempt, "threadId") != Some(thread_id));
}

fn update_title(projection: &mut Projection, payload: &Value) {
    let Some(thread_id) = field(payload, "threadId") else {
        return;
    };
    let Some(title) = payload.get("title").and_then(Value::as_str) else {
        return;
    };
    let Some(thread) = projection
        .threads
        .get_mut(thread_id)
        .and_then(Value::as_object_mut)
    else {
        return;
    };
    thread.insert("title".to_owned(), Value::String(title.to_owned()));
    if let Some(updated_at) = payload.get("updatedAt").and_then(Value::as_str) {
        let current = thread.get("updatedAt").and_then(Value::as_str);
        if current.is_none_or(|current| current < updated_at) {
            thread.insert("updatedAt".to_owned(), Value::String(updated_at.to_owned()));
        }
    }
}

fn append_message(projection: &mut Projection, payload: &Value) {
    let Some(thread_id) = field(payload, "threadId") else {
        return;
    };
    let Some(message) = payload.get("message").cloned() else {
        return;
    };
    let Some(thread) = projection.threads.get_mut(thread_id) else {
        return;
    };
    let Some(messages) = thread.get_mut("messages").and_then(Value::as_array_mut) else {
        return;
    };
    let message_id = owned_field(&message, "id");
    if message_id.as_ref().is_some_and(|id| {
        messages
            .iter()
            .any(|item| owned_field(item, "id").as_ref() == Some(id))
    }) {
        return;
    }
    messages.push(message);
}

pub(super) fn correlation(payload: &Value, key: &str) -> Option<String> {
    owned_field(payload, key).or_else(|| {
        ["thread", "run", "attempt", "message", "call", "agent"]
            .iter()
            .find_map(|object| {
                payload
                    .get(object)
                    .and_then(|value| owned_field(value, key))
            })
    })
}

pub(super) fn sorted_values(values: &HashMap<String, Value>, timestamp: &str) -> Vec<Value> {
    let mut result = values.values().cloned().collect::<Vec<_>>();
    result.sort_by(|left, right| {
        field(right, timestamp)
            .unwrap_or_default()
            .cmp(field(left, timestamp).unwrap_or_default())
    });
    result
}

pub(super) fn thread_summary(mut thread: Value) -> Value {
    if let Some(object) = thread.as_object_mut() {
        object.remove("messages");
        object.remove("runs");
        object.remove("attempts");
        object.remove("events");
    }
    thread
}

pub(super) fn values_for(values: &HashMap<String, Value>, key: &str, expected: &str) -> Vec<Value> {
    let mut result = values
        .values()
        .filter(|value| field(value, key) == Some(expected))
        .cloned()
        .collect::<Vec<_>>();
    result.sort_by(|left, right| {
        field(left, "createdAt")
            .unwrap_or_default()
            .cmp(field(right, "createdAt").unwrap_or_default())
    });
    result
}

pub(super) fn field<'a>(value: &'a Value, key: &str) -> Option<&'a str> {
    value.get(key)?.as_str()
}

pub(super) fn owned_field(value: &Value, key: &str) -> Option<String> {
    field(value, key).map(ToOwned::to_owned)
}

#[cfg(test)]
mod tests {
    use serde_json::json;

    use super::*;

    #[test]
    fn title_update_preserves_thread_state() {
        let mut projection = Projection::default();
        apply(
            &mut projection,
            &event(
                "thread.saved",
                json!({
                    "thread": {
                        "id": "thread-1",
                        "title": "Initial title",
                        "status": "complete",
                        "updatedAt": "2026-01-01T00:00:00.000Z",
                        "messages": [{ "id": "message-1" }],
                    },
                }),
            ),
        );
        apply(
            &mut projection,
            &event(
                "thread.title_updated",
                json!({
                    "threadId": "thread-1",
                    "title": "Agent title",
                    "updatedAt": "2026-01-02T00:00:00.000Z",
                }),
            ),
        );

        let thread = projection.threads.get("thread-1").unwrap();
        assert_eq!(thread["title"], "Agent title");
        assert_eq!(thread["status"], "complete");
        assert_eq!(thread["messages"][0]["id"], "message-1");
    }

    fn event(kind: &str, payload: Value) -> Event {
        Event {
            sequence: 1,
            id: "event-1".to_owned(),
            kind: kind.to_owned(),
            thread_id: None,
            run_id: None,
            attempt_id: None,
            created_at: "2026-01-01T00:00:00.000Z".to_owned(),
            payload,
        }
    }
}
