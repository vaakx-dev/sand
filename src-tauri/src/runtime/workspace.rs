use std::sync::{Arc, Mutex};

use tokio::sync::mpsc;
use tokio::task::JoinHandle;

use crate::{
    acp::{Acp, Event as AcpEvent, Events as AcpEvents},
    journal::Journal,
};

use super::{RuntimeError, paths::WorkspacePaths};

pub(super) struct Workspace {
    pub(super) paths: WorkspacePaths,
    pub(super) journal: Arc<Journal>,
    pub(super) acp: Arc<Acp>,
    event_task: Mutex<Option<JoinHandle<()>>>,
}

impl Workspace {
    pub(super) fn open(
        paths: WorkspacePaths,
    ) -> Result<(Arc<Self>, mpsc::UnboundedReceiver<AcpEvent>), RuntimeError> {
        let journal = Arc::new(Journal::open(&paths.journal)?);
        let snapshot = journal.snapshot();
        let (events, receiver) = AcpEvents::channel(Arc::clone(&journal));
        let acp = Acp::new(paths.info.path.clone(), &snapshot, events.clone());
        Ok((
            Arc::new(Self {
                paths,
                journal,
                acp,
                event_task: Mutex::new(None),
            }),
            receiver,
        ))
    }

    pub(super) fn set_event_task(&self, task: JoinHandle<()>) {
        *self
            .event_task
            .lock()
            .expect("workspace event task lock is not poisoned") = Some(task);
    }

    pub(super) async fn shutdown(&self) {
        self.acp.shutdown().await;
        if let Some(task) = self
            .event_task
            .lock()
            .expect("workspace event task lock is not poisoned")
            .take()
        {
            task.abort();
        }
    }
}
