use std::path::PathBuf;

use tauri::{AppHandle, Manager};

use super::RuntimeError;

pub(super) struct RuntimePaths {
    pub(super) root: PathBuf,
    pub(super) host: PathBuf,
    pub(super) extensions: PathBuf,
    pub(super) user_extensions: PathBuf,
    pub(super) workspace: PathBuf,
    pub(super) cache: PathBuf,
    pub(super) config: PathBuf,
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
        let development = development_root.join("runtime/host.ts").is_file();
        let root = if development {
            development_root
        } else {
            resource_root
        };
        let host = root.join("runtime/host.ts");
        if !host.is_file() {
            return Err(RuntimeError::MissingHost(host.display().to_string()));
        }

        let workspace = std::env::var_os("SAND_WORKSPACE")
            .map(PathBuf::from)
            .or_else(|| development.then(|| root.clone()))
            .or_else(|| std::env::current_dir().ok())
            .unwrap_or_else(|| root.clone());
        let config = app
            .path()
            .app_config_dir()
            .unwrap_or_else(|_| workspace.join(".sand/config"));

        Ok(Self {
            host,
            extensions: root.join("extensions"),
            user_extensions: config.join("extensions"),
            cache: workspace.join(".sand/cache"),
            config,
            journal: workspace.join(".sand/orchestration.sqlite3"),
            workspace,
            root,
        })
    }
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
