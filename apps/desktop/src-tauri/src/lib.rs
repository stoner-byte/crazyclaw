use std::path::PathBuf;
use std::sync::Mutex;
use tauri::Manager;
use tauri_plugin_shell::process::{CommandChild, CommandEvent};
use tauri_plugin_shell::ShellExt;

struct SidecarState(Mutex<Option<CommandChild>>);

fn terminate_sidecar(state: &SidecarState, reason: &str) {
    if let Ok(mut guard) = state.0.lock() {
        if let Some(child) = guard.take() {
            if let Err(error) = child.kill() {
                log::error!("Failed to terminate CrazyClaw server on {}: {}", reason, error);
            } else {
                log::info!("CrazyClaw server terminated on {}", reason);
            }
        }
    }
}

impl Drop for SidecarState {
    fn drop(&mut self) {
        terminate_sidecar(self, "state drop");
    }
}

fn server_entry(app: &tauri::App) -> PathBuf {
    let dev_entry = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("resources")
        .join("server")
        .join("dist")
        .join("main.js");
    if dev_entry.exists() {
        return dev_entry;
    }

    let resource_dir = app
        .path()
        .resource_dir()
        .expect("failed to resolve bundled resources");
    let bundled_entry = resource_dir
        .join("resources")
        .join("server")
        .join("dist")
        .join("main.js");
    if bundled_entry.exists() {
        return bundled_entry;
    }

    resource_dir.join("server").join("dist").join("main.js")
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let app = tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            let entry = server_entry(app);
            let (mut rx, child) = app
                .shell()
                .sidecar("crazyclaw-node")
                .expect("failed to create CrazyClaw server sidecar command")
                .env("HOST", "127.0.0.1")
                .args([entry.to_string_lossy().to_string()])
                .spawn()
                .expect("failed to spawn CrazyClaw server sidecar");

            app.manage(SidecarState(Mutex::new(Some(child))));

            tauri::async_runtime::spawn(async move {
                while let Some(event) = rx.recv().await {
                    match event {
                        CommandEvent::Stdout(line) => {
                            log::info!("[crazyclaw-server] {}", String::from_utf8_lossy(&line));
                        }
                        CommandEvent::Stderr(line) => {
                            log::error!("[crazyclaw-server] {}", String::from_utf8_lossy(&line));
                        }
                        CommandEvent::Error(error) => {
                            log::error!("[crazyclaw-server] error: {}", error);
                        }
                        CommandEvent::Terminated(status) => {
                            log::warn!("[crazyclaw-server] terminated: {:?}", status);
                            break;
                        }
                        _ => {}
                    }
                }
            });

            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building CrazyClaw desktop shell");

    app.run(|app_handle, event| {
        if let tauri::RunEvent::Exit = event {
            let state = app_handle.state::<SidecarState>();
            terminate_sidecar(&state, "run event exit");
        }
    });
}
