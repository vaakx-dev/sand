use std::{path::PathBuf, sync::Arc};

use serde_json::json;

use crate::{acp::Event as AcpEvent, journal::Record};

use super::{Runtime, RuntimeError, Workspace, WorkspaceInfo, WorkspacePaths};

impl Runtime {
    pub async fn active_workspace(&self) -> Result<WorkspaceInfo, RuntimeError> {
        let id = self
            .active_workspace_id()
            .ok_or_else(|| RuntimeError::Request("no workspace is open".to_owned()))?;
        self.workspaces
            .read()
            .await
            .get(&id)
            .map(|workspace| workspace.paths.info.clone())
            .ok_or(RuntimeError::UnknownWorkspace(id))
    }

    pub async fn open_workspace(
        self: &Arc<Self>,
        path: PathBuf,
    ) -> Result<WorkspaceInfo, RuntimeError> {
        let _change = self.workspace_changes.lock().await;
        let paths = WorkspacePaths::resolve(&self.home, path)?;
        if let Some(workspace) = self.workspaces.read().await.get(&paths.info.id) {
            let info = workspace.paths.info.clone();
            self.select_workspace(&info.id);
            return Ok(info);
        }

        let (workspace, receiver) = Workspace::open(paths)?;
        let info = workspace.paths.info.clone();
        let snapshot = workspace.journal.snapshot();
        self.workspaces
            .write()
            .await
            .insert(info.id.clone(), Arc::clone(&workspace));
        workspace.set_event_task(tokio::spawn(Self::read_acp_events(
            Arc::clone(self),
            info.id.clone(),
            receiver,
        )));

        let result = self
            .request_worker(
                None,
                "workspace.open".to_owned(),
                json!({ "workspace": info, "snapshot": snapshot }),
            )
            .await;
        if let Err(error) = result {
            self.workspaces.write().await.remove(&info.id);
            workspace.shutdown().await;
            return Err(error);
        }
        self.select_workspace(&info.id);
        Ok(info)
    }

    pub async fn close_workspace(&self, id: &str) -> Result<WorkspaceInfo, RuntimeError> {
        let _change = self.workspace_changes.lock().await;
        let workspaces = self.workspaces.read().await;
        if !workspaces.contains_key(id) {
            return Err(RuntimeError::UnknownWorkspace(id.to_owned()));
        }
        if workspaces.len() == 1 {
            return Err(RuntimeError::LastWorkspace);
        }
        let replacement = workspaces
            .values()
            .find(|workspace| workspace.paths.info.id != id)
            .expect("another workspace exists")
            .paths
            .info
            .clone();
        drop(workspaces);

        self.request_worker(None, "workspace.close".to_owned(), json!({ "id": id }))
            .await?;
        let workspace = self
            .workspaces
            .write()
            .await
            .remove(id)
            .ok_or_else(|| RuntimeError::UnknownWorkspace(id.to_owned()))?;
        workspace.shutdown().await;
        if self.active_workspace_id().as_deref() == Some(id) {
            self.select_workspace(&replacement.id);
        }
        self.active_workspace().await
    }

    pub(super) async fn workspace(&self, id: Option<&str>) -> Result<Arc<Workspace>, RuntimeError> {
        let id = id
            .map(ToOwned::to_owned)
            .or_else(|| self.active_workspace_id())
            .ok_or_else(|| RuntimeError::Request("no workspace is open".to_owned()))?;
        self.workspaces
            .read()
            .await
            .get(&id)
            .cloned()
            .ok_or(RuntimeError::UnknownWorkspace(id))
    }

    pub(super) async fn record(&self, workspace_id: &str, record: Record) {
        let workspace = match self.workspace(Some(workspace_id)).await {
            Ok(workspace) => workspace,
            Err(error) => {
                self.push_event(
                    None,
                    "runtime.protocol_error",
                    json!({ "message": error.to_string() }),
                );
                return;
            }
        };
        match workspace.journal.append(record) {
            Ok(event) => self.push_event(
                Some(workspace_id),
                "journal.event",
                serde_json::to_value(event).expect("journal event is serializable"),
            ),
            Err(error) => self.push_event(
                Some(workspace_id),
                "journal.error",
                json!({ "message": error.to_string() }),
            ),
        }
    }

    pub(super) async fn shutdown_workspaces(&self) {
        let ids = self
            .workspaces
            .read()
            .await
            .keys()
            .cloned()
            .collect::<Vec<_>>();
        for id in ids {
            let _ = self
                .request_worker(None, "workspace.close".to_owned(), json!({ "id": id }))
                .await;
            if let Some(workspace) = self.workspaces.write().await.remove(&id) {
                workspace.shutdown().await;
            }
        }
    }

    fn active_workspace_id(&self) -> Option<String> {
        self.active_workspace
            .read()
            .expect("active workspace lock is not poisoned")
            .clone()
    }

    fn select_workspace(&self, id: &str) {
        *self
            .active_workspace
            .write()
            .expect("active workspace lock is not poisoned") = Some(id.to_owned());
    }

    async fn read_acp_events(
        runtime: Arc<Self>,
        workspace_id: String,
        mut receiver: tokio::sync::mpsc::UnboundedReceiver<AcpEvent>,
    ) {
        while let Some(event) = receiver.recv().await {
            runtime.push_event(Some(&workspace_id), &event.kind, event.payload);
        }
    }
}
