// All commands are read-safe by default.
// create_worktree and run_workspace_command are the first write-capable commands.
// Safety boundaries are enforced here, not in the UI layer.

use serde::{Deserialize, Serialize};
use std::path::Path;
use std::process::Command;
use std::time::Instant;

// ── Structs ───────────────────────────────────────────────────────────────────

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RepoInfo {
    pub path: String,
    pub has_git: bool,
    pub branch: Option<String>,
    pub is_dirty: bool,
    pub untracked_count: u32,
    pub remote_url: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PlatformInfo {
    pub os: String,
    pub arch: String,
    pub app_version: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WorktreeCreateResult {
    pub success: bool,
    pub worktree_path: Option<String>,
    pub branch_name: String,
    pub stdout: String,
    pub stderr: String,
    pub error: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CommandResult {
    pub exit_code: i32,
    pub stdout: String,
    pub stderr: String,
    pub duration_ms: u64,
    pub blocked: bool,
    pub block_reason: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GitDiffResult {
    pub raw_diff: String,
    pub changed_files: Vec<String>,
    pub insertions: u32,
    pub deletions: u32,
}

// ── Allowlist ─────────────────────────────────────────────────────────────────

const ALLOWED_PREFIXES: &[&str] = &[
    "ls",
    "pwd",
    "git status",
    "git diff",
    "git log",
    "npm test",
    "npm run test",
    "pnpm test",
    "yarn test",
];

const BLOCKED_PATTERNS: &[&str] = &[
    "rm ",
    "sudo",
    "chmod",
    "chown",
    "git reset",
    "git clean",
    "git push",
    "curl",
    "wget",
    " | ",
    ";",
    "&&",
    "||",
    "`",
    "$(",
    "eval",
    "exec",
    "sh -c",
    "bash -c",
];

fn validate_command(command: &str) -> Result<(), String> {
    let cmd = command.trim();
    for pattern in BLOCKED_PATTERNS {
        if cmd.contains(pattern) {
            return Err(format!("Blocked pattern '{}' is not permitted", pattern));
        }
    }
    let allowed = ALLOWED_PREFIXES.iter().any(|prefix| {
        cmd == *prefix || cmd.starts_with(&format!("{} ", prefix))
    });
    if !allowed {
        return Err(format!("Command '{}' is not on the allowlist", cmd.split_whitespace().next().unwrap_or("?")));
    }
    Ok(())
}

fn validate_name(name: &str, label: &str) -> Result<(), String> {
    if name.is_empty() {
        return Err(format!("{} cannot be empty", label));
    }
    if name.len() > 80 {
        return Err(format!("{} is too long (max 80 chars)", label));
    }
    let valid = name.chars().all(|c| c.is_alphanumeric() || c == '-' || c == '_');
    if !valid {
        return Err(format!("{} '{}' contains invalid characters (only a-z, 0-9, -, _ allowed)", label, name));
    }
    Ok(())
}

fn validate_branch_name(name: &str) -> Result<(), String> {
    if name.is_empty() {
        return Err("Branch name cannot be empty".to_string());
    }
    if name.len() > 100 {
        return Err("Branch name is too long".to_string());
    }
    // Allow letters, numbers, hyphens, underscores, forward slashes, dots
    let valid = name.chars().all(|c| c.is_alphanumeric() || matches!(c, '-' | '_' | '/' | '.'));
    if !valid {
        return Err(format!("Branch name '{}' contains invalid characters", name));
    }
    // Disallow leading or trailing slash, double slash, leading dot
    if name.starts_with('/') || name.ends_with('/') || name.contains("//") || name.starts_with('.') {
        return Err(format!("Branch name '{}' has invalid structure", name));
    }
    Ok(())
}

// ── Commands ──────────────────────────────────────────────────────────────────

#[tauri::command]
pub fn validate_repo(path: String) -> RepoInfo {
    let p = Path::new(&path);
    let git_dir = p.join(".git");
    let has_git = git_dir.is_dir();
    let branch = if has_git { read_git_branch(&path) } else { None };
    let remote_url = if has_git { read_git_remote(&path) } else { None };

    RepoInfo { path, has_git, branch, is_dirty: false, untracked_count: 0, remote_url }
}

#[tauri::command]
pub fn get_platform() -> PlatformInfo {
    PlatformInfo {
        os: std::env::consts::OS.to_string(),
        arch: std::env::consts::ARCH.to_string(),
        app_version: env!("CARGO_PKG_VERSION").to_string(),
    }
}

#[tauri::command]
pub fn create_worktree(
    repo_path: String,
    branch_name: String,
    worktree_name: String,
) -> WorktreeCreateResult {
    if let Err(e) = validate_branch_name(&branch_name) {
        return WorktreeCreateResult {
            success: false, worktree_path: None, branch_name,
            stdout: String::new(), stderr: String::new(), error: Some(e),
        };
    }
    if let Err(e) = validate_name(&worktree_name, "Worktree name") {
        return WorktreeCreateResult {
            success: false, worktree_path: None, branch_name,
            stdout: String::new(), stderr: String::new(), error: Some(e),
        };
    }

    let repo = Path::new(&repo_path);
    if !repo.join(".git").is_dir() {
        return WorktreeCreateResult {
            success: false, worktree_path: None, branch_name,
            stdout: String::new(), stderr: String::new(),
            error: Some(format!("'{}' is not a git repository", repo_path)),
        };
    }

    let worktrees_dir = repo.join(".agentos").join("worktrees");
    if let Err(e) = std::fs::create_dir_all(&worktrees_dir) {
        return WorktreeCreateResult {
            success: false, worktree_path: None, branch_name,
            stdout: String::new(), stderr: String::new(),
            error: Some(format!("Failed to create .agentos/worktrees/: {}", e)),
        };
    }

    let worktree_path = worktrees_dir.join(&worktree_name);
    if worktree_path.exists() {
        return WorktreeCreateResult {
            success: false,
            worktree_path: Some(worktree_path.to_string_lossy().into_owned()),
            branch_name,
            stdout: String::new(), stderr: String::new(),
            error: Some(format!("Worktree '{}' already exists", worktree_name)),
        };
    }

    let output = Command::new("git")
        .arg("worktree")
        .arg("add")
        .arg("-b")
        .arg(&branch_name)
        .arg(&worktree_path)
        .current_dir(&repo_path)
        .output();

    match output {
        Ok(out) => {
            let stdout = String::from_utf8_lossy(&out.stdout).into_owned();
            let stderr = String::from_utf8_lossy(&out.stderr).into_owned();
            let success = out.status.success();
            WorktreeCreateResult {
                success,
                worktree_path: if success {
                    Some(worktree_path.to_string_lossy().into_owned())
                } else {
                    None
                },
                branch_name,
                stdout,
                stderr: stderr.clone(),
                error: if success { None } else { Some(stderr) },
            }
        }
        Err(e) => WorktreeCreateResult {
            success: false, worktree_path: None, branch_name,
            stdout: String::new(), stderr: String::new(),
            error: Some(format!("Failed to run git: {}", e)),
        },
    }
}

#[tauri::command]
pub fn run_workspace_command(worktree_path: String, command: String) -> CommandResult {
    if let Err(reason) = validate_command(&command) {
        return CommandResult {
            exit_code: -1,
            stdout: String::new(),
            stderr: String::new(),
            duration_ms: 0,
            blocked: true,
            block_reason: Some(reason),
        };
    }

    let p = Path::new(&worktree_path);
    if !p.exists() {
        return CommandResult {
            exit_code: -1,
            stdout: String::new(),
            stderr: format!("Path '{}' does not exist", worktree_path),
            duration_ms: 0,
            blocked: false,
            block_reason: None,
        };
    }

    let parts: Vec<&str> = command.trim().splitn(2, ' ').collect();
    let program = parts[0];
    let args: Vec<&str> = if parts.len() > 1 {
        parts[1].split_whitespace().collect()
    } else {
        vec![]
    };

    let start = Instant::now();
    let output = Command::new(program)
        .args(&args)
        .current_dir(&worktree_path)
        .output();

    let duration_ms = start.elapsed().as_millis() as u64;

    match output {
        Ok(out) => CommandResult {
            exit_code: out.status.code().unwrap_or(-1),
            stdout: String::from_utf8_lossy(&out.stdout).into_owned(),
            stderr: String::from_utf8_lossy(&out.stderr).into_owned(),
            duration_ms,
            blocked: false,
            block_reason: None,
        },
        Err(e) => CommandResult {
            exit_code: -1,
            stdout: String::new(),
            stderr: format!("Failed to execute '{}': {}", program, e),
            duration_ms,
            blocked: false,
            block_reason: None,
        },
    }
}

#[tauri::command]
pub fn get_git_diff(worktree_path: String) -> GitDiffResult {
    let output = Command::new("git")
        .arg("diff")
        .current_dir(&worktree_path)
        .output();

    let raw_diff = match output {
        Ok(out) => String::from_utf8_lossy(&out.stdout).into_owned(),
        Err(_) => String::new(),
    };

    let mut changed_files: Vec<String> = Vec::new();
    let mut insertions: u32 = 0;
    let mut deletions: u32 = 0;

    for line in raw_diff.lines() {
        if line.starts_with("+++ b/") {
            let f = line.trim_start_matches("+++ b/").to_string();
            if !changed_files.contains(&f) {
                changed_files.push(f);
            }
        } else if line.starts_with('+') && !line.starts_with("+++") {
            insertions += 1;
        } else if line.starts_with('-') && !line.starts_with("---") {
            deletions += 1;
        }
    }

    GitDiffResult { raw_diff, changed_files, insertions, deletions }
}

// ── Git helpers ───────────────────────────────────────────────────────────────

fn read_git_branch(repo_path: &str) -> Option<String> {
    let head = std::fs::read_to_string(Path::new(repo_path).join(".git").join("HEAD")).ok()?;
    let head = head.trim();
    if let Some(branch) = head.strip_prefix("ref: refs/heads/") {
        Some(branch.to_string())
    } else {
        Some(head.chars().take(8).collect())
    }
}

fn read_git_remote(repo_path: &str) -> Option<String> {
    let config = std::fs::read_to_string(Path::new(repo_path).join(".git").join("config")).ok()?;
    for line in config.lines() {
        let line = line.trim();
        if let Some(url) = line.strip_prefix("url = ") {
            return Some(url.to_string());
        }
    }
    None
}
