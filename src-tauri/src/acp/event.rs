use std::sync::Arc;

use serde_json::{Value, json};
use tokio::sync::mpsc;

use crate::orchestration::{Orchestration, OrchestrationError, Record};

#[derive(Debug)]
pub struct Event {
    pub kind: String,
    pub payload: Value,
}

#[derive(Clone)]
pub struct Events {
    sender: mpsc::UnboundedSender<Event>,
    orchestration: Arc<Orchestration>,
}

impl Events {
    pub fn channel(orchestration: Arc<Orchestration>) -> (Self, mpsc::UnboundedReceiver<Event>) {
        let (sender, receiver) = mpsc::unbounded_channel();
        (
            Self {
                sender,
                orchestration,
            },
            receiver,
        )
    }

    pub fn record(
        &self,
        kind: impl Into<String>,
        payload: Value,
    ) -> Result<(), OrchestrationError> {
        let kind = kind.into();
        match self.orchestration.append(Record {
            kind: kind.clone(),
            payload: payload.clone(),
        }) {
            Ok(event) => {
                self.emit(
                    "orchestration.event",
                    serde_json::to_value(event).expect("orchestration event is serializable"),
                );
                self.emit(kind, payload);
                Ok(())
            }
            Err(error) => {
                self.emit(
                    "orchestration.error",
                    json!({ "message": error.to_string() }),
                );
                Err(error)
            }
        }
    }

    pub fn emit(&self, kind: impl Into<String>, payload: Value) {
        let _ = self.sender.send(Event {
            kind: kind.into(),
            payload,
        });
    }
}
