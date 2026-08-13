use std::{future::Future, pin::Pin, sync::Arc};

use serde_json::{Value, json};
use uuid::Uuid;

use super::{
    super::{Acp, CompatTurn, Error, now},
    selection::GenerationSelection,
    thread::{
        append_assistant, append_message, emit_lifecycle, finish, lifecycle_payload,
        message_payload, object_mut, text, update_running,
    },
};

impl Acp {
    pub fn start_compat<'a>(
        self: &'a Arc<Self>,
        mut thread: Value,
        prompt: String,
        selection: GenerationSelection,
    ) -> Pin<Box<dyn Future<Output = Result<Value, Error>> + Send + 'a>> {
        Box::pin(async move {
            let thread_id = text(&thread, "id")?.to_owned();
            if text(&thread, "status").unwrap_or_default() == "running" {
                return Err(Error::BusySession(thread_id));
            }
            let provider_id = text(&thread, "provider")?.to_owned();
            let model = text(&thread, "model")?.to_owned();
            let agent_id = self.agent_for_provider(&provider_id).await?;
            let mut session = self.open_session(&thread_id, &agent_id).await?;
            self.apply_selection(&mut session, &selection).await?;

            let timestamp = now();
            let run_id = Uuid::new_v4().to_string();
            let attempt_id = Uuid::new_v4().to_string();
            let run = json!({
                "id": run_id,
                "threadId": thread_id,
                "provider": provider_id,
                "model": model,
                "status": "running",
                "createdAt": timestamp,
            });
            let attempt = json!({
                "id": attempt_id,
                "threadId": thread_id,
                "runId": run_id,
                "provider": provider_id,
                "status": "running",
                "reason": "start",
                "createdAt": timestamp,
            });
            let message = json!({
                "id": Uuid::new_v4().to_string(),
                "role": "user",
                "content": prompt,
                "createdAt": timestamp,
            });
            update_running(
                &mut thread,
                &provider_id,
                &model,
                &run_id,
                &attempt_id,
                &timestamp,
            )?;
            self.events
                .record("run.started", lifecycle_payload(&thread, &run, &attempt)?)?;
            emit_lifecycle(&self.events, &thread, &run, &attempt)?;
            append_message(&mut thread, message.clone())?;
            let payload = message_payload(&thread, &run_id, &attempt_id, &message)?;
            self.events.record("message.appended", payload.clone())?;
            self.events.emit("agent.message", payload);
            object_mut(&mut thread)?.insert("runs".to_owned(), Value::Array(vec![run.clone()]));
            object_mut(&mut thread)?
                .insert("attempts".to_owned(), Value::Array(vec![attempt.clone()]));

            self.state.write().await.turns.insert(
                session.id.clone(),
                CompatTurn {
                    thread: thread.clone(),
                    run: run.clone(),
                    attempt: attempt.clone(),
                    message_id: Uuid::new_v4().to_string(),
                    message_created_at: timestamp,
                    content: String::new(),
                },
            );

            let owner = Arc::clone(self);
            let request = json!({
                "id": session.id,
                "prompt": prompt,
                "threadId": thread_id,
                "runId": run_id,
                "attemptId": attempt_id,
            });
            tokio::spawn(async move {
                let result = owner.prompt(request).await;
                owner.finish_compat(&session.id, result).await;
            });

            Ok(thread)
        })
    }

    async fn finish_compat(self: &Arc<Self>, session_id: &str, result: Result<Value, Error>) {
        let Some(mut turn) = self.state.write().await.turns.remove(session_id) else {
            return;
        };
        let (status, error) = match result {
            Ok(response)
                if response.get("stopReason").and_then(Value::as_str) == Some("cancelled") =>
            {
                ("cancelled", None)
            }
            Ok(_) => ("complete", None),
            Err(error) => ("error", Some(error.to_string())),
        };
        if !turn.content.is_empty() {
            if let Ok(payload) = append_assistant(&mut turn, None) {
                let _ = self.events.record("message.appended", payload.clone());
                self.events.emit("agent.message", payload);
            }
        }
        let completed_at = now();
        finish(&mut turn.run, status, &completed_at, error.as_deref());
        finish(&mut turn.attempt, status, &completed_at, error.as_deref());
        if let Ok(thread) = object_mut(&mut turn.thread) {
            thread.insert("status".to_owned(), json!(status));
            thread.insert("statusChangedAt".to_owned(), json!(completed_at));
            thread.insert("latestTurnCompletedAt".to_owned(), json!(completed_at));
            thread.insert("updatedAt".to_owned(), json!(completed_at));
            thread.insert("unread".to_owned(), json!(true));
            thread.remove("activeRunId");
            thread.remove("activeAttemptId");
        }
        let state = self.state.read().await;
        if let Ok(current) = self
            .events
            .thread(text(&turn.thread, "id").unwrap_or_default())
        {
            if let Some(title) = current.get("title").cloned() {
                if let Ok(thread) = object_mut(&mut turn.thread) {
                    thread.insert("title".to_owned(), title);
                }
            }
        }
        if let Ok(payload) = lifecycle_payload(&turn.thread, &turn.run, &turn.attempt) {
            let kind = match status {
                "complete" => "run.complete",
                "cancelled" => "run.cancelled",
                _ => "run.error",
            };
            let _ = self.events.record(kind, payload);
        }
        let _ = emit_lifecycle(&self.events, &turn.thread, &turn.run, &turn.attempt);
        drop(state);
        if let Some(message) = error {
            self.events.emit(
                "agent.error",
                json!({
                    "threadId": text(&turn.thread, "id").unwrap_or_default(),
                    "runId": text(&turn.run, "id").unwrap_or_default(),
                    "attemptId": text(&turn.attempt, "id").unwrap_or_default(),
                    "message": message,
                }),
            );
        }

        let queued = turn
            .thread
            .get_mut("queuedTurns")
            .and_then(Value::as_array_mut)
            .and_then(|items| (!items.is_empty()).then(|| items.remove(0)));
        let should_drain = status == "complete"
            || queued
                .as_ref()
                .and_then(|value| value.get("_steer"))
                .and_then(Value::as_bool)
                == Some(true);
        if should_drain {
            if let Some(queued) = queued {
                let prompt = queued
                    .get("prompt")
                    .and_then(Value::as_str)
                    .unwrap_or_default()
                    .to_owned();
                let _ = self.events.record(
                    "turn.dequeued",
                    json!({
                        "threadId": text(&turn.thread, "id").unwrap_or_default(),
                        "thread": turn.thread,
                        "turn": queued,
                    }),
                );
                if !prompt.is_empty() {
                    let selection = selection_from_thread(&turn.thread);
                    let _ = self.start_compat(turn.thread, prompt, selection).await;
                }
            }
        }
    }
}

fn selection_from_thread(thread: &Value) -> GenerationSelection {
    GenerationSelection {
        provider: text(thread, "provider").unwrap_or_default().to_owned(),
        model: text(thread, "model").unwrap_or_default().to_owned(),
        ..GenerationSelection::default()
    }
}
