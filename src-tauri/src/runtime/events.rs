use std::sync::atomic::Ordering;

use serde_json::Value;

use super::{Runtime, RuntimeEvent};

const EVENT_LIMIT: usize = 4_000;

impl Runtime {
    pub fn events_after(&self, after: u64) -> Vec<RuntimeEvent> {
        self.events
            .lock()
            .expect("runtime event queue lock is not poisoned")
            .iter()
            .filter(|event| event.seq > after)
            .cloned()
            .collect()
    }

    pub(super) fn push_event(&self, workspace_id: Option<&str>, kind: &str, payload: Value) {
        let seq = self.next_event.fetch_add(1, Ordering::Relaxed);
        let mut events = self
            .events
            .lock()
            .expect("runtime event queue lock is not poisoned");
        events.push_back(RuntimeEvent {
            seq,
            workspace_id: workspace_id.map(ToOwned::to_owned),
            kind: kind.to_owned(),
            payload,
        });
        while events.len() > EVENT_LIMIT {
            events.pop_front();
        }
    }
}
