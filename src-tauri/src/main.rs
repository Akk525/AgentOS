#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod db;
mod skills_commands;
mod store_commands;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            commands::validate_repo,
            commands::get_platform,
            commands::create_worktree,
            commands::run_workspace_command,
            commands::get_git_diff,
            commands::write_workspace_files,
            commands::merge_worktree,
            commands::remove_worktree,
            commands::read_workspace_file,
            commands::search_workspace,
            skills_commands::discover_skills,
            store_commands::store_init,
            store_commands::store_get_status,
            store_commands::store_list_projects,
            store_commands::store_create_project,
            store_commands::store_update_project,
            store_commands::store_get_project,
            store_commands::store_upsert_node,
            store_commands::store_delete_node,
            store_commands::store_upsert_edge,
            store_commands::store_delete_edge,
            store_commands::store_append_event,
            store_commands::store_list_events,
            store_commands::store_upsert_session,
            store_commands::store_list_sessions,
            store_commands::store_upsert_memory,
            store_commands::store_list_memories,
            store_commands::store_search_memories,
            store_commands::store_delete_memory,
        ])
        .run(tauri::generate_context!())
        .expect("error while running AgentOS");
}
