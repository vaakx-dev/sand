use std::path::{Path, PathBuf};

use serde::Serialize;
use tauri::{AppHandle, Manager};

use super::RuntimeError;

pub(super) struct RuntimePaths {
    pub(super) root: PathBuf,
    pub(super) app: PathBuf,
    pub(super) extensions: PathBuf,
    pub(super) home: PathBuf,
    pub(super) initial_workspace: PathBuf,
}

#[derive(Clone, Debug, Serialize)]
pub struct WorkspaceInfo {
    pub id: String,
    pub path: PathBuf,
    pub home: PathBuf,
}

pub(super) struct WorkspacePaths {
    pub(super) info: WorkspaceInfo,
    pub(super) journal: PathBuf,
}

impl RuntimePaths {
    pub(super) fn resolve(app: &AppHandle) -> Result<Self, RuntimeError> {
        let development_root = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .parent()
            .expect("src-tauri has a parent")
            .to_path_buf();
        let resource_root = app
            .path()
            .resource_dir()
            .unwrap_or_else(|_| development_root.clone());
        let resource_root = dunce::simplified(&resource_root).to_path_buf();
        let development = cfg!(debug_assertions);
        let root = if development {
            development_root
        } else {
            resource_root
        };
        let app_entry = root.join("runtime/app.ts");
        if !app_entry.is_file() {
            return Err(RuntimeError::MissingRuntimeFile(
                app_entry.display().to_string(),
            ));
        }
        let initial_workspace = std::env::var_os("SAND_WORKSPACE")
            .map(PathBuf::from)
            .or_else(|| development.then(|| root.clone()))
            .or_else(|| std::env::current_dir().ok())
            .unwrap_or_else(|| root.clone());
        let home = app
            .path()
            .home_dir()
            .map_err(|error| RuntimeError::Home(error.to_string()))?
            .join(".sand");

        Ok(Self {
            app: app_entry,
            extensions: root.join("extensions"),
            initial_workspace,
            home,
            root,
        })
    }
}

impl WorkspacePaths {
    pub(super) fn resolve(home: &Path, path: impl AsRef<Path>) -> Result<Self, RuntimeError> {
        let path = canonical_workspace(path)?;
        let workspace_home = workspace_home(home, &path);
        Ok(Self {
            journal: workspace_home.join("journal.sqlite3"),
            info: WorkspaceInfo {
                id: workspace_id(&path),
                path,
                home: workspace_home,
            },
        })
    }
}

fn workspace_home(home: &Path, workspace: &Path) -> PathBuf {
    home.join("workspaces").join(workspace_id(workspace))
}

fn workspace_id(workspace: &Path) -> String {
    uuid::Uuid::new_v5(&uuid::Uuid::NAMESPACE_URL, &workspace_bytes(workspace))
        .simple()
        .to_string()
}

#[cfg(unix)]
fn workspace_bytes(workspace: &Path) -> Vec<u8> {
    use std::os::unix::ffi::OsStrExt;

    workspace.as_os_str().as_bytes().to_vec()
}

#[cfg(windows)]
fn workspace_bytes(workspace: &Path) -> Vec<u8> {
    use std::os::windows::ffi::OsStrExt;

    workspace
        .as_os_str()
        .encode_wide()
        .flat_map(u16::to_le_bytes)
        .collect()
}

pub(crate) fn canonical_workspace(path: impl AsRef<Path>) -> Result<PathBuf, RuntimeError> {
    let path = path.as_ref();
    let workspace = dunce::canonicalize(path).map_err(|source| RuntimeError::Workspace {
        path: path.display().to_string(),
        source,
    })?;
    if !workspace.is_dir() {
        return Err(RuntimeError::WorkspaceDirectory(
            workspace.display().to_string(),
        ));
    }
    Ok(workspace)
}

pub(super) fn bun_executable() -> PathBuf {
    if let Some(path) = std::env::var_os("SAND_BUN") {
        return PathBuf::from(path);
    }

    #[cfg(target_os = "windows")]
    {
        let candidates = [
            std::env::var_os("BUN_INSTALL")
                .map(PathBuf::from)
                .map(|path| path.join("bin/bun.exe")),
            std::env::var_os("USERPROFILE")
                .map(PathBuf::from)
                .map(|path| path.join(".bun/bin/bun.exe")),
            std::env::var_os("APPDATA")
                .map(PathBuf::from)
                .map(|path| path.join("npm/node_modules/bun/bin/bun.exe")),
        ];
        if let Some(path) = candidates.into_iter().flatten().find(|path| path.is_file()) {
            return path;
        }
    }

    PathBuf::from(if cfg!(target_os = "windows") {
        "bun.exe"
    } else {
        "bun"
    })
}
