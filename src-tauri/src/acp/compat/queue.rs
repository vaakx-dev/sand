use serde_json::{Value, json};
use uuid::Uuid;

use super::{
    super::{Acp, Error, now},
    thread::{array_mut, summary, text},
};

impl Acp {
    pub async fn queue_compat(
        &self,
        thread_id: &str,
        prompt: &str,
        steer: bool,
    ) -> Result<Value, Error> {
        if prompt.trim().is_empty() {
            return Err(Error::Invalid("prompt is required".to_owned()));
        }
        let mut state = self.state.write().await;
        let turn = state
            .turns
            .values_mut()
            .find(|turn| text(&turn.thread, "id").ok() == Some(thread_id))
            .ok_or_else(|| Error::Invalid("thread has no active run".to_owned()))?;
        let queued = json!({
            "id": Uuid::new_v4().to_string(),
            "prompt": prompt.trim(),
            "provider": text(&turn.thread, "provider")?,
            "model": text(&turn.thread, "model")?,
            "createdAt": now(),
            "_steer": steer,
        });
        array_mut(&mut turn.thread, "queuedTurns")?.push(queued.clone());
        let payload = json!({
            "threadId": thread_id,
            "thread": turn.thread,
            "turn": queued,
        });
        let summary = summary(&turn.thread)?;
        let queued_turns = turn.thread.get("queuedTurns").cloned().unwrap_or(json!([]));
        drop(state);
        self.events.record("turn.queued", payload)?;
        self.events.emit(
            "agent.queue",
            json!({
                "threadId": thread_id,
                "queuedTurns": queued_turns,
            }),
        );
        self.events
            .emit("threads.changed", json!({ "thread": summary.clone() }));
        Ok(summary)
    }

    pub async fn cancel_compat(&self, thread_id: &str) -> Result<Value, Error> {
        let session = self
            .session_for_thread(thread_id)
            .await
            .ok_or_else(|| Error::Invalid("thread has no ACP session".to_owned()))?;
        self.cancel(json!({ "id": session.id })).await
    }

    pub async fn steer_compat(&self, thread_id: &str, prompt: &str) -> Result<Value, Error> {
        self.queue_compat(thread_id, prompt, true).await?;
        let thread = self
            .state
            .read()
            .await
            .turns
            .values()
            .find(|turn| text(&turn.thread, "id").ok() == Some(thread_id))
            .map(|turn| turn.thread.clone())
            .ok_or_else(|| Error::Invalid("thread has no active run".to_owned()))?;
        self.cancel_compat(thread_id).await?;
        Ok(thread)
    }
}
