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
        "thread.deleted" => delete_thread(projection, &event.payload),
        "message.appended" => append_message(projection, &event.payload),
        kind if kind.starts_with("run.") => {
            save(&mut projection.threads, &event.payload, "thread");
            save(&mut projection.runs, &event.payload, "run");
            save(&mut projection.attempts, &event.payload, "attempt");
        }
        kind if kind.starts_with("attempt.") => {
            save(&mut projection.attempts, &event.payload, "attempt")
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
        ["thread", "run", "attempt", "message", "call"]
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
