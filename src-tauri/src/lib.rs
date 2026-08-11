mod acp;
mod journal;
mod runtime;

use std::{path::PathBuf, sync::Arc};

use runtime::{Runtime, RuntimeEvent, WorkspaceInfo};
use serde::Serialize;
use serde_json::Value;
use tauri::{Emitter, Manager, State, webview::PageLoadEvent};

struct RuntimeState(Arc<Runtime>);

#[derive(Clone, Serialize)]
struct BrowserNavigation {
    label: String,
    url: String,
}

#[tauri::command]
async fn runtime_call(
    state: State<'_, RuntimeState>,
    workspace_id: Option<String>,
    method: String,
    params: Option<Value>,
) -> Result<Value, String> {
    state
        .0
        .request(workspace_id, method, params.unwrap_or(Value::Null))
        .await
        .map_err(|error| error.to_string())
}

#[tauri::command]
fn runtime_events(state: State<'_, RuntimeState>, after: u64) -> Vec<RuntimeEvent> {
    state.0.events_after(after)
}

#[tauri::command]
async fn workspace_active(state: State<'_, RuntimeState>) -> Result<WorkspaceInfo, String> {
    state
        .0
        .active_workspace()
        .await
        .map_err(|error| error.to_string())
}

#[tauri::command]
async fn workspace_open(
    state: State<'_, RuntimeState>,
    path: String,
) -> Result<WorkspaceInfo, String> {
    state
        .0
        .open_workspace(PathBuf::from(path))
        .await
        .map_err(|error| error.to_string())
}

#[tauri::command]
async fn workspace_close(
    state: State<'_, RuntimeState>,
    id: String,
) -> Result<WorkspaceInfo, String> {
    state
        .0
        .close_workspace(&id)
        .await
        .map_err(|error| error.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let app = tauri::Builder::default()
        .on_page_load(|webview, payload| {
            if payload.event() != PageLoadEvent::Started
                || !webview.label().starts_with("sand-browser-")
            {
                return;
            }
            let _ = webview.emit_to(
                "main",
                "sand://browser-navigated",
                BrowserNavigation {
                    label: webview.label().to_owned(),
                    url: payload.url().to_string(),
                },
            );
        })
        .setup(|app| {
            let runtime = tauri::async_runtime::block_on(Runtime::start(app.handle()))?;
            app.manage(RuntimeState(runtime));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            runtime_call,
            runtime_events,
            workspace_active,
            workspace_open,
            workspace_close,
        ])
        .build(tauri::generate_context!())
        .expect("error while building Sand");
    app.run(|app, event| {
        if let tauri::RunEvent::Exit = event {
            let runtime = Arc::clone(&app.state::<RuntimeState>().0);
            tauri::async_runtime::block_on(runtime.shutdown());
        }
    });
}
