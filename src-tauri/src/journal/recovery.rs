use std::collections::HashMap;

use serde_json::{Map, Value, json};

use super::{
    Journal, JournalError, Record,
    database::append,
    projection::{field, owned_field},
    timestamp,
};

impl Journal {
    pub(super) fn reconcile(&self) -> Result<(), JournalError> {
        let mut store = self.store.lock().expect("journal lock is not poisoned");
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
        let recoverable = recoverable_runs(&runs, &attempts);

        interrupt_attempts(&mut store, attempts, &timestamp)?;
        interrupt_runs(&mut store, runs, &timestamp)?;
        interrupt_threads(&mut store, recoverable, &timestamp)?;
        disconnect_agents(&mut store, agents, &timestamp)?;
        interrupt_sessions(&mut store, sessions, &timestamp)?;
        Ok(())
    }
}

struct RecoverableRun {
    thread_id: String,
    run_id: String,
    attempt_id: Option<String>,
}

fn recoverable_runs(runs: &[Value], attempts: &[Value]) -> Vec<RecoverableRun> {
    let attempts_by_run = attempts
        .iter()
        .filter_map(|attempt| Some((owned_field(attempt, "runId")?, owned_field(attempt, "id")?)))
        .collect::<HashMap<_, _>>();
    let mut by_thread = runs
        .iter()
        .filter_map(|run| {
            let thread_id = owned_field(run, "threadId")?;
            let run_id = owned_field(run, "id")?;
            let attempt_id = attempts_by_run.get(&run_id).cloned();
            Some((
                thread_id.clone(),
                RecoverableRun {
                    thread_id,
                    run_id,
                    attempt_id,
                },
            ))
        })
        .collect::<HashMap<_, _>>()
        .into_values()
        .collect::<Vec<_>>();
    by_thread.sort_by(|left, right| left.thread_id.cmp(&right.thread_id));
    by_thread
}

fn interrupt_attempts(
    store: &mut super::Store,
    attempts: Vec<Value>,
    timestamp: &str,
) -> Result<(), JournalError> {
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
) -> Result<(), JournalError> {
    for mut run in runs {
        interrupt(&mut run, timestamp);
        append(
            store,
            Record {
                kind: "run.interrupted".to_owned(),
                payload: correlated_payload("run", run)?,
            },
        )?;
    }
    Ok(())
}

fn interrupt_threads(
    store: &mut super::Store,
    runs: Vec<RecoverableRun>,
    timestamp: &str,
) -> Result<(), JournalError> {
    for run in runs {
        let Some(mut thread) = store.projection.threads.get(&run.thread_id).cloned() else {
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
                ("recoverableRunId", json!(run.run_id)),
            ],
        );
        if let Some(attempt_id) = run.attempt_id {
            set_fields(&mut thread, &[("recoverableAttemptId", json!(attempt_id))]);
        }
        remove_fields(&mut thread, &["activeRunId", "activeAttemptId"]);
        append(
            store,
            Record {
                kind: "thread.saved".to_owned(),
                payload: json!({ "threadId": run.thread_id, "thread": thread }),
            },
        )?;
    }
    Ok(())
}

fn disconnect_agents(
    store: &mut super::Store,
    agents: Vec<Value>,
    timestamp: &str,
) -> Result<(), JournalError> {
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
) -> Result<(), JournalError> {
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

fn correlated_payload(key: &str, value: Value) -> Result<Value, JournalError> {
    let object = value
        .as_object()
        .ok_or(JournalError::Missing("projection object"))?;
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
