use serde_json::{Map, Value, json};
use uuid::Uuid;

use super::super::{CompatTurn, Error, Events, now};

pub(super) fn append_assistant(
    turn: &mut CompatTurn,
    tool_call: Option<Value>,
) -> Result<Value, Error> {
    let mut message = json!({
        "id": turn.message_id,
        "role": "assistant",
        "content": turn.content,
        "createdAt": turn.message_created_at,
    });
    if let Some(call) = tool_call {
        object_mut(&mut message)?.insert("toolCalls".to_owned(), Value::Array(vec![call]));
    }
    append_message(&mut turn.thread, message.clone())?;
    let payload = message_payload(
        &turn.thread,
        text(&turn.run, "id")?,
        text(&turn.attempt, "id")?,
        &message,
    )?;
    turn.message_id = Uuid::new_v4().to_string();
    turn.message_created_at = now();
    turn.content.clear();
    Ok(payload)
}

pub(super) fn update_running(
    thread: &mut Value,
    provider: &str,
    model: &str,
    run_id: &str,
    attempt_id: &str,
    timestamp: &str,
) -> Result<(), Error> {
    let object = object_mut(thread)?;
    object.insert("provider".to_owned(), json!(provider));
    object.insert("model".to_owned(), json!(model));
    object.insert("status".to_owned(), json!("running"));
    object.insert("statusChangedAt".to_owned(), json!(timestamp));
    object.insert("latestTurnStartedAt".to_owned(), json!(timestamp));
    object.insert("lastVisitedAt".to_owned(), json!(timestamp));
    object.insert("wakeAcknowledgedAt".to_owned(), json!(timestamp));
    object.insert("updatedAt".to_owned(), json!(timestamp));
    object.insert("unread".to_owned(), json!(false));
    object.insert("activeRunId".to_owned(), json!(run_id));
    object.insert("activeAttemptId".to_owned(), json!(attempt_id));
    object.remove("settledAt");
    object.remove("snoozedAt");
    object.remove("snoozedUntil");
    Ok(())
}

pub(super) fn finish(value: &mut Value, status: &str, timestamp: &str, error: Option<&str>) {
    if let Some(object) = value.as_object_mut() {
        object.insert("status".to_owned(), json!(status));
        object.insert("completedAt".to_owned(), json!(timestamp));
        if let Some(error) = error {
            object.insert("error".to_owned(), json!(error));
        }
        if status == "cancelled" {
            object.insert("stopReason".to_owned(), json!("cancelled"));
        }
    }
}

pub(super) fn append_message(thread: &mut Value, message: Value) -> Result<(), Error> {
    array_mut(thread, "messages")?.push(message);
    Ok(())
}

pub(super) fn array_mut<'a>(value: &'a mut Value, key: &str) -> Result<&'a mut Vec<Value>, Error> {
    let object = object_mut(value)?;
    if !object.contains_key(key) {
        object.insert(key.to_owned(), Value::Array(Vec::new()));
    }
    object
        .get_mut(key)
        .and_then(Value::as_array_mut)
        .ok_or_else(|| Error::Invalid(format!("{key} must be an array")))
}

pub(super) fn object_mut(value: &mut Value) -> Result<&mut Map<String, Value>, Error> {
    value
        .as_object_mut()
        .ok_or_else(|| Error::Invalid("thread state must be an object".to_owned()))
}

pub(super) fn text<'a>(value: &'a Value, key: &str) -> Result<&'a str, Error> {
    value
        .get(key)
        .and_then(Value::as_str)
        .filter(|value| !value.is_empty())
        .ok_or_else(|| Error::Invalid(format!("{key} is required")))
}

pub(super) fn lifecycle_payload(
    thread: &Value,
    run: &Value,
    attempt: &Value,
) -> Result<Value, Error> {
    Ok(json!({
        "threadId": text(thread, "id")?,
        "runId": text(run, "id")?,
        "attemptId": text(attempt, "id")?,
        "thread": thread,
        "run": run,
        "attempt": attempt,
    }))
}

pub(super) fn message_payload(
    thread: &Value,
    run_id: &str,
    attempt_id: &str,
    message: &Value,
) -> Result<Value, Error> {
    Ok(json!({
        "threadId": text(thread, "id")?,
        "runId": run_id,
        "attemptId": attempt_id,
        "thread": thread,
        "message": message,
    }))
}

pub(super) fn emit_lifecycle(
    events: &Events,
    thread: &Value,
    run: &Value,
    attempt: &Value,
) -> Result<(), Error> {
    let thread_id = text(thread, "id")?;
    events.emit(
        "agent.status",
        json!({
            "threadId": thread_id,
            "runId": text(run, "id")?,
            "attemptId": text(attempt, "id")?,
            "status": text(thread, "status")?,
        }),
    );
    events.emit("agent.run", json!({ "threadId": thread_id, "run": run }));
    events.emit(
        "agent.attempt",
        json!({ "threadId": thread_id, "attempt": attempt }),
    );
    events.emit("threads.changed", json!({ "thread": summary(thread)? }));
    Ok(())
}

pub(in crate::acp) fn summary(thread: &Value) -> Result<Value, Error> {
    let mut summary = thread.clone();
    let object = object_mut(&mut summary)?;
    object.remove("messages");
    object.remove("runs");
    object.remove("attempts");
    Ok(summary)
}
