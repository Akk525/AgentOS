// All commands are read-safe by default.
// create_worktree and run_workspace_command are the first write-capable commands.
// Safety boundaries are enforced here, not in the UI layer.

use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Component, Path, PathBuf};
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

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceFileWrite {
    pub path: String,
    pub content: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WriteWorkspaceFilesResult {
    pub success: bool,
    pub files_written: u32,
    pub error: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MergeWorktreeResult {
    pub success: bool,
    pub conflict: bool,
    pub stdout: String,
    pub stderr: String,
    pub error: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RemoveWorktreeResult {
    pub success: bool,
    pub stdout: String,
    pub stderr: String,
    pub error: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ReadWorkspaceFileResult {
    pub success: bool,
    pub content: String,
    pub path: String,
    pub error: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchWorkspaceMatch {
    pub path: String,
    pub line: u32,
    pub text: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchWorkspaceResult {
    pub success: bool,
    pub matches: Vec<SearchWorkspaceMatch>,
    pub error: Option<String>,
}

const MAX_FILE_BYTES: usize = 512 * 1024;
const MAX_SEARCH_OUTPUT_BYTES: usize = 64 * 1024;
const MAX_SEARCH_MATCHES: usize = 50;
const MAX_FILES_PER_CALL: usize = 20;

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

fn safe_join_worktree(worktree_path: &Path, rel_path: &str) -> Result<PathBuf, String> {
    let rel = rel_path.trim();
    if rel.is_empty() {
        return Err("File path cannot be empty".to_string());
    }
    if rel.starts_with('/') || rel.starts_with('\\') {
        return Err(format!("Absolute paths are not allowed: {}", rel));
    }

    let rel_path_obj = Path::new(rel);
    for component in rel_path_obj.components() {
        match component {
            Component::ParentDir => {
                return Err(format!("Parent directory segments are not allowed: {}", rel));
            }
            Component::RootDir | Component::Prefix(_) => {
                return Err(format!("Absolute paths are not allowed: {}", rel));
            }
            _ => {}
        }
    }

    let joined = worktree_path.join(rel_path_obj);
    let worktree_canonical = worktree_path
        .canonicalize()
        .map_err(|e| format!("Invalid worktree path: {}", e))?;

    if let Some(parent) = joined.parent() {
        if let Ok(parent_canonical) = parent.canonicalize() {
            if !parent_canonical.starts_with(&worktree_canonical) {
                return Err(format!("Path escapes worktree: {}", rel));
            }
        } else if !parent.starts_with(worktree_path) {
            return Err(format!("Path escapes worktree: {}", rel));
        }
    }

    Ok(joined)
}

#[tauri::command]
pub fn read_workspace_file(worktree_path: String, rel_path: String) -> ReadWorkspaceFileResult {
    let worktree = Path::new(&worktree_path);
    if !worktree.is_dir() {
        return ReadWorkspaceFileResult {
            success: false,
            content: String::new(),
            path: rel_path,
            error: Some(format!("Worktree path '{}' does not exist", worktree_path)),
        };
    }

    let target = match safe_join_worktree(worktree, &rel_path) {
        Ok(p) => p,
        Err(e) => {
            return ReadWorkspaceFileResult {
                success: false,
                content: String::new(),
                path: rel_path,
                error: Some(e),
            };
        }
    };

    if !target.is_file() {
        return ReadWorkspaceFileResult {
            success: false,
            content: String::new(),
            path: rel_path.clone(),
            error: Some(format!("File not found: {}", rel_path)),
        };
    }

    match fs::read_to_string(&target) {
        Ok(content) => {
            if content.len() > MAX_FILE_BYTES {
                return ReadWorkspaceFileResult {
                    success: false,
                    content: String::new(),
                    path: rel_path.clone(),
                    error: Some(format!("File '{}' exceeds max size (512 KB)", rel_path)),
                };
            }
            ReadWorkspaceFileResult {
                success: true,
                content,
                path: rel_path,
                error: None,
            }
        }
        Err(e) => ReadWorkspaceFileResult {
            success: false,
            content: String::new(),
            path: rel_path.clone(),
            error: Some(format!("Failed to read '{}': {}", rel_path, e)),
        },
    }
}

#[tauri::command]
pub fn search_workspace(
    worktree_path: String,
    query: String,
    limit: Option<u32>,
) -> SearchWorkspaceResult {
    let worktree = Path::new(&worktree_path);
    if !worktree.is_dir() {
        return SearchWorkspaceResult {
            success: false,
            matches: vec![],
            error: Some(format!("Worktree path '{}' does not exist", worktree_path)),
        };
    }

    let trimmed = query.trim();
    if trimmed.is_empty() {
        return SearchWorkspaceResult {
            success: false,
            matches: vec![],
            error: Some("Search query cannot be empty".to_string()),
        };
    }

    let max_matches = limit.unwrap_or(20).min(MAX_SEARCH_MATCHES as u32) as usize;
    let mut matches: Vec<SearchWorkspaceMatch> = Vec::new();

    // Prefer ripgrep when available
    let rg_result = Command::new("rg")
        .args([
            "--no-heading",
            "--line-number",
            "--max-count",
            &max_matches.to_string(),
            "--max-filesize",
            "512K",
            trimmed,
            ".",
        ])
        .current_dir(worktree)
        .output();

    if let Ok(output) = rg_result {
        if output.status.success() || !output.stdout.is_empty() {
            let stdout = String::from_utf8_lossy(&output.stdout);
            for line in stdout.lines().take(max_matches) {
                let parts: Vec<&str> = line.splitn(3, ':').collect();
                if parts.len() >= 3 {
                    matches.push(SearchWorkspaceMatch {
                        path: parts[0].to_string(),
                        line: parts[1].parse().unwrap_or(0),
                        text: parts[2].to_string(),
                    });
                }
            }
            return SearchWorkspaceResult {
                success: true,
                matches,
                error: None,
            };
        }
    }

    // Fallback: grep -r
    let grep_result = Command::new("grep")
        .args(["-rn", "--", trimmed, "."])
        .current_dir(worktree)
        .output();

    match grep_result {
        Ok(output) => {
            let stdout = String::from_utf8_lossy(&output.stdout);
            let mut total_bytes = 0usize;
            for line in stdout.lines() {
                if matches.len() >= max_matches || total_bytes >= MAX_SEARCH_OUTPUT_BYTES {
                    break;
                }
                let parts: Vec<&str> = line.splitn(3, ':').collect();
                if parts.len() >= 3 {
                    total_bytes += line.len();
                    matches.push(SearchWorkspaceMatch {
                        path: parts[0].trim_start_matches("./").to_string(),
                        line: parts[1].parse().unwrap_or(0),
                        text: parts[2].to_string(),
                    });
                }
            }
            SearchWorkspaceResult {
                success: true,
                matches,
                error: None,
            }
        }
        Err(e) => SearchWorkspaceResult {
            success: false,
            matches: vec![],
            error: Some(format!("Search failed (rg/grep unavailable): {}", e)),
        },
    }
}

#[tauri::command]
pub fn write_workspace_files(
    worktree_path: String,
    files: Vec<WorkspaceFileWrite>,
) -> WriteWorkspaceFilesResult {
    if files.is_empty() {
        return WriteWorkspaceFilesResult {
            success: false,
            files_written: 0,
            error: Some("No files provided".to_string()),
        };
    }
    if files.len() > MAX_FILES_PER_CALL {
        return WriteWorkspaceFilesResult {
            success: false,
            files_written: 0,
            error: Some(format!("Too many files (max {})", MAX_FILES_PER_CALL)),
        };
    }

    let worktree = Path::new(&worktree_path);
    if !worktree.is_dir() {
        return WriteWorkspaceFilesResult {
            success: false,
            files_written: 0,
            error: Some(format!("Worktree path '{}' does not exist", worktree_path)),
        };
    }

    let mut written = 0u32;
    for file in &files {
        if file.content.len() > MAX_FILE_BYTES {
            return WriteWorkspaceFilesResult {
                success: false,
                files_written: written,
                error: Some(format!("File '{}' exceeds max size (512 KB)", file.path)),
            };
        }
        if file.content.contains('\0') {
            return WriteWorkspaceFilesResult {
                success: false,
                files_written: written,
                error: Some(format!("File '{}' contains null bytes", file.path)),
            };
        }

        let target = match safe_join_worktree(worktree, &file.path) {
            Ok(p) => p,
            Err(e) => {
                return WriteWorkspaceFilesResult {
                    success: false,
                    files_written: written,
                    error: Some(e),
                };
            }
        };

        if let Some(parent) = target.parent() {
            if let Err(e) = fs::create_dir_all(parent) {
                return WriteWorkspaceFilesResult {
                    success: false,
                    files_written: written,
                    error: Some(format!("Failed to create directory for '{}': {}", file.path, e)),
                };
            }
        }

        if let Err(e) = fs::write(&target, &file.content) {
            return WriteWorkspaceFilesResult {
                success: false,
                files_written: written,
                error: Some(format!("Failed to write '{}': {}", file.path, e)),
            };
        }
        written += 1;
    }

    WriteWorkspaceFilesResult {
        success: true,
        files_written: written,
        error: None,
    }
}

fn validate_worktree_path(repo_path: &str, worktree_path: &str) -> Result<(), String> {
    let repo = Path::new(repo_path).canonicalize().map_err(|e| e.to_string())?;
    let wt = Path::new(worktree_path).canonicalize().map_err(|e| e.to_string())?;
    let allowed_root = repo.join(".agentos").join("worktrees");
    if !wt.starts_with(&allowed_root) {
        return Err(format!(
            "Worktree path '{}' is outside '{}'",
            worktree_path,
            allowed_root.to_string_lossy()
        ));
    }
    Ok(())
}

#[tauri::command]
pub fn merge_worktree(
    repo_path: String,
    branch_name: String,
    target_branch: Option<String>,
) -> MergeWorktreeResult {
    let target = target_branch.unwrap_or_else(|| "main".to_string());

    if let Err(e) = validate_branch_name(&branch_name) {
        return MergeWorktreeResult {
            success: false,
            conflict: false,
            stdout: String::new(),
            stderr: String::new(),
            error: Some(e),
        };
    }
    if let Err(e) = validate_branch_name(&target) {
        return MergeWorktreeResult {
            success: false,
            conflict: false,
            stdout: String::new(),
            stderr: String::new(),
            error: Some(e),
        };
    }

    let repo = Path::new(&repo_path);
    if !repo.join(".git").is_dir() {
        return MergeWorktreeResult {
            success: false,
            conflict: false,
            stdout: String::new(),
            stderr: String::new(),
            error: Some(format!("'{}' is not a git repository", repo_path)),
        };
    }

    let checkout = Command::new("git")
        .args(["checkout", &target])
        .current_dir(&repo_path)
        .output();

    let checkout = match checkout {
        Ok(out) => out,
        Err(e) => {
            return MergeWorktreeResult {
                success: false,
                conflict: false,
                stdout: String::new(),
                stderr: String::new(),
                error: Some(format!("Failed to run git checkout: {}", e)),
            };
        }
    };

    if !checkout.status.success() {
        let stderr = String::from_utf8_lossy(&checkout.stderr).into_owned();
        return MergeWorktreeResult {
            success: false,
            conflict: false,
            stdout: String::from_utf8_lossy(&checkout.stdout).into_owned(),
            stderr: stderr.clone(),
            error: Some(stderr),
        };
    }

    let status = Command::new("git")
        .args(["status", "--porcelain"])
        .current_dir(&repo_path)
        .output();

    if let Ok(out) = status {
        let dirty = String::from_utf8_lossy(&out.stdout);
        if !dirty.trim().is_empty() {
            return MergeWorktreeResult {
                success: false,
                conflict: false,
                stdout: String::new(),
                stderr: String::new(),
                error: Some(format!(
                    "Target branch '{}' has uncommitted changes; commit or stash before merge",
                    target
                )),
            };
        }
    }

    let merge = Command::new("git")
        .args(["merge", "--no-ff", &branch_name])
        .current_dir(&repo_path)
        .output();

    match merge {
        Ok(out) => {
            let stdout = String::from_utf8_lossy(&out.stdout).into_owned();
            let stderr = String::from_utf8_lossy(&out.stderr).into_owned();
            let combined = format!("{}\n{}", stdout, stderr);
            let conflict = combined.contains("CONFLICT") || out.status.code() == Some(1);
            let success = out.status.success();
            let error = if success {
                None
            } else if conflict {
                Some("Merge conflict".to_string())
            } else {
                Some(stderr.clone())
            };
            MergeWorktreeResult {
                success,
                conflict,
                stdout,
                stderr,
                error,
            }
        }
        Err(e) => MergeWorktreeResult {
            success: false,
            conflict: false,
            stdout: String::new(),
            stderr: String::new(),
            error: Some(format!("Failed to run git merge: {}", e)),
        },
    }
}

#[tauri::command]
pub fn remove_worktree(
    repo_path: String,
    worktree_path: String,
    branch_name: Option<String>,
) -> RemoveWorktreeResult {
    if let Err(e) = validate_worktree_path(&repo_path, &worktree_path) {
        return RemoveWorktreeResult {
            success: false,
            stdout: String::new(),
            stderr: String::new(),
            error: Some(e),
        };
    }

    let remove = Command::new("git")
        .args(["worktree", "remove", "--force", &worktree_path])
        .current_dir(&repo_path)
        .output();

    let mut stdout = String::new();
    let mut stderr = String::new();

    match remove {
        Ok(out) => {
            stdout.push_str(&String::from_utf8_lossy(&out.stdout));
            stderr.push_str(&String::from_utf8_lossy(&out.stderr));
            if !out.status.success() {
                return RemoveWorktreeResult {
                    success: false,
                    stdout,
                    stderr: stderr.clone(),
                    error: Some(stderr),
                };
            }
        }
        Err(e) => {
            return RemoveWorktreeResult {
                success: false,
                stdout: String::new(),
                stderr: String::new(),
                error: Some(format!("Failed to run git worktree remove: {}", e)),
            };
        }
    }

    if let Some(branch) = branch_name {
        if validate_branch_name(&branch).is_ok() {
            if let Ok(out) = Command::new("git")
                .args(["branch", "-d", &branch])
                .current_dir(&repo_path)
                .output()
            {
                stdout.push_str(&String::from_utf8_lossy(&out.stdout));
                stderr.push_str(&String::from_utf8_lossy(&out.stderr));
            }
        }
    }

    RemoveWorktreeResult {
        success: true,
        stdout,
        stderr,
        error: None,
    }
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
