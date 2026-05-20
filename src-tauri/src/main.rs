#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            commands::validate_repo,
            commands::get_platform,
            commands::create_worktree,
            commands::run_workspace_command,
            commands::get_git_diff,
        ])
        .run(tauri::generate_context!())
        .expect("error while running AgentOS");
}
