use std::sync::Arc;

use serde_json::{Value, json};
use uuid::Uuid;

use super::{
    super::{
        CompatTurn, Events, SessionRecord, State,
        completion::capture_update,
        model::{now, protocol_error},
    },
    thread::{append_assistant, append_message, message_payload, text},
};

pub(crate) async fn publish_update(
    state: &Arc<tokio::sync::RwLock<State>>,
    events: &Events,
    session: &SessionRecord,
    update: &Value,
) -> Result<(), agent_client_protocol::Error> {
    if capture_update(state, session, update).await {
        return Ok(());
    }
    let kind = update
        .get("sessionUpdate")
        .and_then(Value::as_str)
        .unwrap_or_default();
    if kind == "session_info_update" {
        return Ok(());
    }
    let mut state = state.write().await;
    let Some(turn) = state.turns.get_mut(&session.id) else {
        return Ok(());
    };
    let published = match kind {
        "agent_message_chunk" => Some(publish_delta(turn, update)),
        "tool_call" => Some(publish_tool_call(turn, update)?),
        "tool_call_update"
            if matches!(
                update.get("status").and_then(Value::as_str),
                Some("completed" | "failed")
            ) =>
        {
            Some(publish_tool_result(turn, update)?)
        }
        _ => None,
    };
    drop(state);
    if let Some(published) = published {
        published.send(events)?;
    }
    Ok(())
}

fn publish_delta(turn: &mut CompatTurn, update: &Value) -> Published {
    let delta = update
        .get("content")
        .and_then(|value| value.get("text"))
        .and_then(Value::as_str)
        .unwrap_or_default();
    turn.content.push_str(delta);
    Published::Emit(
        "agent.delta",
        json!({
            "threadId": text(&turn.thread, "id").unwrap_or_default(),
            "runId": text(&turn.run, "id").unwrap_or_default(),
            "attemptId": text(&turn.attempt, "id").unwrap_or_default(),
            "delta": delta,
        }),
    )
}

fn publish_tool_call(
    turn: &mut CompatTurn,
    update: &Value,
) -> Result<Published, agent_client_protocol::Error> {
    let tool_call = json!({
        "id": update.get("toolCallId").cloned().unwrap_or(Value::Null),
        "name": update.get("name").or_else(|| update.get("title")).cloned()
            .unwrap_or_else(|| json!("tool")),
        "arguments": update.get("rawInput").cloned().unwrap_or_else(|| json!({})),
    });
    let payload = append_assistant(turn, Some(tool_call)).map_err(protocol_error)?;
    Ok(Published::Record(
        "message.appended",
        "agent.message",
        payload,
    ))
}

fn publish_tool_result(
    turn: &mut CompatTurn,
    update: &Value,
) -> Result<Published, agent_client_protocol::Error> {
    let output = update
        .get("rawOutput")
        .or_else(|| update.get("content"))
        .cloned()
        .unwrap_or(Value::Null);
    let message = json!({
        "id": Uuid::new_v4().to_string(),
        "role": "tool",
        "content": serde_json::to_string_pretty(&output).unwrap_or_default(),
        "toolCallId": update.get("toolCallId").cloned().unwrap_or(Value::Null),
        "createdAt": now(),
    });
    append_message(&mut turn.thread, message.clone()).map_err(protocol_error)?;
    let payload = message_payload(
        &turn.thread,
        text(&turn.run, "id").unwrap_or_default(),
        text(&turn.attempt, "id").unwrap_or_default(),
        &message,
    )
    .map_err(protocol_error)?;
    Ok(Published::Record(
        "message.appended",
        "agent.message",
        payload,
    ))
}

enum Published {
    Emit(&'static str, Value),
    Record(&'static str, &'static str, Value),
}

impl Published {
    fn send(self, events: &Events) -> Result<(), agent_client_protocol::Error> {
        match self {
            Self::Emit(kind, payload) => events.emit(kind, payload),
            Self::Record(record, event, payload) => {
                events
                    .record(record, payload.clone())
                    .map_err(protocol_error)?;
                events.emit(event, payload);
            }
        }
        Ok(())
    }
}
