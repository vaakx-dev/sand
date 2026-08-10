use std::sync::{Arc, atomic::Ordering};

use serde_json::Value;
use tokio::sync::mpsc;

use super::{Runtime, RuntimeEvent};
use crate::acp::Event as AcpEvent;

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

    pub(super) async fn read_acp_events(
        runtime: Arc<Self>,
        mut receiver: mpsc::UnboundedReceiver<AcpEvent>,
    ) {
        while let Some(event) = receiver.recv().await {
            runtime.push_event(&event.kind, event.payload);
        }
    }

    pub(super) fn push_event(&self, kind: &str, payload: Value) {
        let seq = self.next_event.fetch_add(1, Ordering::Relaxed);
        let mut events = self
            .events
            .lock()
            .expect("runtime event queue lock is not poisoned");
        events.push_back(RuntimeEvent {
            seq,
            kind: kind.to_owned(),
            payload,
        });
        while events.len() > EVENT_LIMIT {
            events.pop_front();
        }
    }
}
