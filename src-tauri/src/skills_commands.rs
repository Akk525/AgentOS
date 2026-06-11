// Skill discovery — scans Cursor-compatible SKILL.md directories.

use serde::Serialize;
use std::fs;
use std::path::{Path, PathBuf};

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DiscoveredSkillFile {
    pub id: String,
    pub scope: String,
    pub source_path: String,
    pub content: String,
}

fn skill_id_from_dir(dir_name: &str) -> String {
    format!("skill-{}", dir_name.replace('_', "-"))
}

fn scan_skills_dir(base: &Path, scope: &str, out: &mut Vec<DiscoveredSkillFile>) {
    if !base.is_dir() {
        return;
    }

    let entries = match fs::read_dir(base) {
        Ok(e) => e,
        Err(_) => return,
    };

    for entry in entries.flatten() {
        let path = entry.path();
        if !path.is_dir() {
            continue;
        }
        let skill_md = path.join("SKILL.md");
        if !skill_md.is_file() {
            continue;
        }
        let content = match fs::read_to_string(&skill_md) {
            Ok(c) => c,
            Err(_) => continue,
        };
        let dir_name = path
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("unknown");
        out.push(DiscoveredSkillFile {
            id: skill_id_from_dir(dir_name),
            scope: scope.to_string(),
            source_path: skill_md.to_string_lossy().to_string(),
            content,
        });
    }
}

fn home_cursor_skills_dir() -> Option<PathBuf> {
    std::env::var_os("HOME").map(|h| PathBuf::from(h).join(".cursor").join("skills"))
}

#[tauri::command]
pub fn discover_skills(repo_path: Option<String>) -> Vec<DiscoveredSkillFile> {
    let mut skills = Vec::new();

    if let Some(home_dir) = home_cursor_skills_dir() {
        scan_skills_dir(&home_dir, "personal", &mut skills);
    }

    if let Some(repo) = repo_path {
        let project_dir = Path::new(&repo).join(".cursor").join("skills");
        scan_skills_dir(&project_dir, "project", &mut skills);
    }

    skills
}
