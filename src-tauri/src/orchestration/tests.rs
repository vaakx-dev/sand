use std::fs;

use serde_json::json;
use uuid::Uuid;

use super::{Orchestration, Record, projection::field};

#[test]
fn replays_state_and_interrupts_active_work() {
    let path = std::env::temp_dir().join(format!("sand-journal-{}.sqlite3", Uuid::new_v4()));
    {
        let journal = Orchestration::open(&path).expect("journal opens");
        journal
            .append(Record {
                kind: "thread.saved".to_owned(),
                payload: json!({
                    "threadId": "thread-1",
                    "thread": {
                        "id": "thread-1",
                        "title": "Test",
                        "status": "running",
                        "updatedAt": "2026-01-01T00:00:00.000Z",
                        "messages": []
                    }
                }),
            })
            .expect("thread is saved");
        journal
            .append(Record {
                kind: "run.started".to_owned(),
                payload: json!({
                    "threadId": "thread-1",
                    "runId": "run-1",
                    "run": {
                        "id": "run-1",
                        "threadId": "thread-1",
                        "status": "running",
                        "createdAt": "2026-01-01T00:00:00.000Z"
                    }
                }),
            })
            .expect("run is saved");
        journal
            .append(Record {
                kind: "message.appended".to_owned(),
                payload: json!({
                    "threadId": "thread-1",
                    "runId": "run-1",
                    "message": {
                        "id": "message-1",
                        "role": "assistant",
                        "content": "durable",
                        "createdAt": "2026-01-01T00:00:01.000Z"
                    }
                }),
            })
            .expect("message is saved");
        journal
            .append(Record {
                kind: "acp.agent.connected".to_owned(),
                payload: json!({
                    "agentId": "agent-1",
                    "agent": {
                        "id": "agent-1",
                        "status": "connected",
                        "updatedAt": "2026-01-01T00:00:00.000Z"
                    }
                }),
            })
            .expect("ACP agent is saved");
        journal
            .append(Record {
                kind: "acp.prompt.started".to_owned(),
                payload: json!({
                    "threadId": "thread-1",
                    "runId": "run-1",
                    "attemptId": "attempt-1",
                    "sessionId": "session-1",
                    "session": {
                        "id": "session-1",
                        "agentId": "agent-1",
                        "status": "running",
                        "runId": "run-1",
                        "attemptId": "attempt-1",
                        "updatedAt": "2026-01-01T00:00:00.000Z"
                    }
                }),
            })
            .expect("ACP session is saved");
    }

    let journal = Orchestration::open(&path).expect("journal reopens");
    let thread = journal.thread("thread-1").expect("thread is restored");
    assert_eq!(field(&thread, "status"), Some("interrupted"));
    assert_eq!(field(&thread["runs"][0], "status"), Some("interrupted"));
    assert_eq!(field(&thread["messages"][0], "content"), Some("durable"));
    let agent = &journal.acp_agents()[0];
    assert_eq!(field(agent, "status"), Some("disconnected"));
    let session = journal
        .acp_session("session-1")
        .expect("ACP session is restored");
    assert_eq!(field(&session, "status"), Some("interrupted"));
    assert!(session.get("runId").is_none());
    assert!(session.get("attemptId").is_none());
    drop(journal);
    let _ = fs::remove_file(&path);
    let _ = fs::remove_file(path.with_extension("sqlite3-wal"));
    let _ = fs::remove_file(path.with_extension("sqlite3-shm"));
}
