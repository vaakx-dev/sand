use serde_json::{Map, Value, json};

use super::{
    Orchestration, OrchestrationError, Record,
    journal::append,
    projection::{field, owned_field},
    timestamp,
};

impl Orchestration {
    pub(super) fn reconcile(&self) -> Result<(), OrchestrationError> {
        let mut store = self
            .store
            .lock()
            .expect("orchestration lock is not poisoned");
        let timestamp = timestamp();
        let attempts = store
            .projection
            .attempts
            .values()
            .filter(|attempt| field(attempt, "status") == Some("running"))
            .cloned()
            .collect::<Vec<_>>();
        let runs = store
            .projection
            .runs
            .values()
            .filter(|run| field(run, "status") == Some("running"))
            .cloned()
            .collect::<Vec<_>>();
        let agents = store
            .projection
            .acp_agents
            .values()
            .filter(|agent| matches!(field(agent, "status"), Some("connecting" | "connected")))
            .cloned()
            .collect::<Vec<_>>();
        let sessions = store
            .projection
            .acp_sessions
            .values()
            .filter(|session| field(session, "status") == Some("running"))
            .cloned()
            .collect::<Vec<_>>();

        interrupt_attempts(&mut store, attempts, &timestamp)?;
        let threads = interrupt_runs(&mut store, runs, &timestamp)?;
        interrupt_threads(&mut store, threads, &timestamp)?;
        disconnect_agents(&mut store, agents, &timestamp)?;
        interrupt_sessions(&mut store, sessions, &timestamp)?;
        Ok(())
    }
}

fn interrupt_attempts(
    store: &mut super::Store,
    attempts: Vec<Value>,
    timestamp: &str,
) -> Result<(), OrchestrationError> {
    for mut attempt in attempts {
        interrupt(&mut attempt, timestamp);
        append(
            store,
            Record {
                kind: "attempt.interrupted".to_owned(),
                payload: correlated_payload("attempt", attempt)?,
            },
        )?;
    }
    Ok(())
}

fn interrupt_runs(
    store: &mut super::Store,
    runs: Vec<Value>,
    timestamp: &str,
) -> Result<Vec<String>, OrchestrationError> {
    let mut threads = Vec::new();
    for mut run in runs {
        interrupt(&mut run, timestamp);
        if let Some(thread_id) = owned_field(&run, "threadId") {
            threads.push(thread_id);
        }
        append(
            store,
            Record {
                kind: "run.interrupted".to_owned(),
                payload: correlated_payload("run", run)?,
            },
        )?;
    }
    threads.sort();
    threads.dedup();
    Ok(threads)
}

fn interrupt_threads(
    store: &mut super::Store,
    threads: Vec<String>,
    timestamp: &str,
) -> Result<(), OrchestrationError> {
    for thread_id in threads {
        let Some(mut thread) = store.projection.threads.get(&thread_id).cloned() else {
            continue;
        };
        set_fields(
            &mut thread,
            &[
                ("status", json!("interrupted")),
                ("statusChangedAt", json!(timestamp)),
                ("latestTurnCompletedAt", json!(timestamp)),
                ("updatedAt", json!(timestamp)),
                ("unread", json!(true)),
            ],
        );
        remove_fields(&mut thread, &["activeRunId", "activeAttemptId"]);
        append(
            store,
            Record {
                kind: "thread.saved".to_owned(),
                payload: json!({ "threadId": thread_id, "thread": thread }),
            },
        )?;
    }
    Ok(())
}

fn disconnect_agents(
    store: &mut super::Store,
    agents: Vec<Value>,
    timestamp: &str,
) -> Result<(), OrchestrationError> {
    for mut agent in agents {
        set_fields(
            &mut agent,
            &[
                ("status", json!("disconnected")),
                ("updatedAt", json!(timestamp)),
                ("error", json!("Sand restarted")),
            ],
        );
        let agent_id = owned_field(&agent, "id").unwrap_or_default();
        append(
            store,
            Record {
                kind: "acp.agent.disconnected".to_owned(),
                payload: json!({ "agentId": agent_id, "agent": agent }),
            },
        )?;
    }
    Ok(())
}

fn interrupt_sessions(
    store: &mut super::Store,
    sessions: Vec<Value>,
    timestamp: &str,
) -> Result<(), OrchestrationError> {
    for mut session in sessions {
        set_fields(
            &mut session,
            &[
                ("status", json!("interrupted")),
                ("updatedAt", json!(timestamp)),
                ("error", json!("Sand restarted during the ACP prompt")),
            ],
        );
        remove_fields(&mut session, &["runId", "attemptId"]);
        let session_id = owned_field(&session, "id").unwrap_or_default();
        append(
            store,
            Record {
                kind: "acp.session.interrupted".to_owned(),
                payload: json!({ "sessionId": session_id, "session": session }),
            },
        )?;
    }
    Ok(())
}

fn correlated_payload(key: &str, value: Value) -> Result<Value, OrchestrationError> {
    let object = value
        .as_object()
        .ok_or(OrchestrationError::Missing("projection object"))?;
    let correlations = ["threadId", "runId", "attemptId"]
        .into_iter()
        .filter_map(|name| object.get(name).cloned().map(|value| (name, value)))
        .collect::<Vec<_>>();
    let mut payload = Map::new();
    payload.insert(key.to_owned(), value);
    for (name, value) in correlations {
        payload.insert(name.to_owned(), value);
    }
    Ok(Value::Object(payload))
}

fn interrupt(value: &mut Value, timestamp: &str) {
    set_fields(
        value,
        &[
            ("status", json!("interrupted")),
            ("completedAt", json!(timestamp)),
            ("error", json!("Run interrupted when Sand stopped")),
        ],
    );
}

fn set_fields(value: &mut Value, fields: &[(&str, Value)]) {
    let Some(object) = value.as_object_mut() else {
        return;
    };
    for (name, value) in fields {
        object.insert((*name).to_owned(), value.clone());
    }
}

fn remove_fields(value: &mut Value, fields: &[&str]) {
    let Some(object) = value.as_object_mut() else {
        return;
    };
    for name in fields {
        object.remove(*name);
    }
}
