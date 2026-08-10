use std::sync::Arc;

use serde_json::{Value, json};
use tokio::sync::mpsc;

use crate::journal::{Journal, JournalError, Record};

#[derive(Debug)]
pub struct Event {
    pub kind: String,
    pub payload: Value,
}

#[derive(Clone)]
pub struct Events {
    sender: mpsc::UnboundedSender<Event>,
    journal: Arc<Journal>,
}

impl Events {
    pub fn channel(journal: Arc<Journal>) -> (Self, mpsc::UnboundedReceiver<Event>) {
        let (sender, receiver) = mpsc::unbounded_channel();
        (Self { sender, journal }, receiver)
    }

    pub fn record(&self, kind: impl Into<String>, payload: Value) -> Result<(), JournalError> {
        let kind = kind.into();
        match self.journal.append(Record {
            kind: kind.clone(),
            payload: payload.clone(),
        }) {
            Ok(event) => {
                self.emit(
                    "journal.event",
                    serde_json::to_value(event).expect("journal event is serializable"),
                );
                self.emit(kind, payload);
                Ok(())
            }
            Err(error) => {
                self.emit("journal.error", json!({ "message": error.to_string() }));
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
