mod acp;
mod orchestration;
mod runtime;

use std::sync::Arc;
use std::{env, fs, process::Command};

use runtime::{Runtime, RuntimeEvent};
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
    method: String,
    params: Option<Value>,
) -> Result<Value, String> {
    state
        .0
        .request(method, params.unwrap_or(Value::Null))
        .await
        .map_err(|error| error.to_string())
}

#[tauri::command]
fn runtime_events(state: State<'_, RuntimeState>, after: u64) -> Vec<RuntimeEvent> {
    state.0.events_after(after)
}

#[tauri::command]
fn switch_workspace(app: tauri::AppHandle, path: String) -> Result<(), String> {
    let workspace = fs::canonicalize(path).map_err(|error| error.to_string())?;
    if !workspace.is_dir() {
        return Err("workspace must be a directory".to_owned());
    }
    let executable = env::current_exe().map_err(|error| error.to_string())?;
    Command::new(executable)
        .env("SAND_WORKSPACE", workspace)
        .spawn()
        .map_err(|error| error.to_string())?;
    app.exit(0);
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
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
            switch_workspace
        ])
        .run(tauri::generate_context!())
        .expect("error while running Sand");
}
