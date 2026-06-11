use crate::db::store::{
    DbStore, EventRow, GraphEdgeRow, GraphNodeRow, ProjectRow, SessionRow, StoreStatus,
};
use serde::{Deserialize, Serialize};
use std::sync::OnceLock;
use tauri::{AppHandle, Manager};

static DB: OnceLock<DbStore> = OnceLock::new();

fn db() -> Result<&'static DbStore, String> {
    DB.get().ok_or_else(|| "Store not initialized. Call store_init first.".to_string())
}

fn db_path(app: &AppHandle) -> Result<std::path::PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?;
    Ok(dir.join("agentos.db"))
}

fn now_iso() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let secs = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();
    format!("{secs}")
}

fn uid(prefix: &str) -> String {
    format!("{prefix}-{}", uuid_simple())
}

fn uuid_simple() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let nanos = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_nanos();
    format!("{nanos:x}")
}

// ── Response types (camelCase for TS) ────────────────────────────────────────

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StoreInitResult {
    pub available: bool,
    pub db_path: String,
    pub schema_version: i32,
    pub is_empty: bool,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StoreStatusResult {
    pub project_count: u32,
    pub node_count: u32,
    pub edge_count: u32,
    pub event_count: u32,
    pub session_count: u32,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectDto {
    pub id: String,
    pub title: String,
    pub goal_text: String,
    pub governance_mode: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GraphNodeDto {
    pub id: String,
    pub project_id: String,
    #[serde(rename = "type")]
    pub node_type: String,
    pub parent_id: Option<String>,
    pub title: String,
    pub description: String,
    pub status: String,
    pub acceptance_criteria: Vec<String>,
    pub assigned_role: Option<String>,
    pub assigned_session_id: Option<String>,
    pub branch: Option<String>,
    pub metadata: serde_json::Value,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GraphEdgeDto {
    pub id: String,
    pub project_id: String,
    pub from_node_id: String,
    pub to_node_id: String,
    pub edge_type: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StoredEventDto {
    pub id: String,
    pub project_id: Option<String>,
    pub session_id: Option<String>,
    pub node_id: Option<String>,
    #[serde(rename = "type")]
    pub event_type: String,
    pub message: String,
    pub severity: String,
    pub payload: serde_json::Value,
    pub timestamp: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StoredSessionDto {
    pub id: String,
    pub project_id: String,
    pub node_id: Option<String>,
    pub data: serde_json::Value,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectWithGraphDto {
    pub project: ProjectDto,
    pub nodes: Vec<GraphNodeDto>,
    pub edges: Vec<GraphEdgeDto>,
}

// ── Input types ──────────────────────────────────────────────────────────────

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateProjectInput {
    pub title: String,
    pub goal_text: String,
    pub governance_mode: Option<String>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateProjectInput {
    pub project_id: String,
    pub title: Option<String>,
    pub governance_mode: Option<String>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpsertNodeInput {
    pub id: Option<String>,
    pub project_id: String,
    #[serde(rename = "type")]
    pub node_type: String,
    pub parent_id: Option<String>,
    pub title: String,
    pub description: Option<String>,
    pub status: Option<String>,
    pub acceptance_criteria: Option<Vec<String>>,
    pub assigned_role: Option<String>,
    pub assigned_session_id: Option<String>,
    pub branch: Option<String>,
    pub metadata: Option<serde_json::Value>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpsertEdgeInput {
    pub id: Option<String>,
    pub project_id: String,
    pub from_node_id: String,
    pub to_node_id: String,
    pub edge_type: Option<String>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppendEventInput {
    pub project_id: Option<String>,
    pub session_id: Option<String>,
    pub node_id: Option<String>,
    #[serde(rename = "type")]
    pub event_type: String,
    pub message: String,
    pub severity: Option<String>,
    pub payload: Option<serde_json::Value>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpsertSessionInput {
    pub id: Option<String>,
    pub project_id: String,
    pub node_id: Option<String>,
    pub data: serde_json::Value,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ListEventsInput {
    pub project_id: Option<String>,
    pub limit: Option<u32>,
    pub offset: Option<u32>,
}

// ── Mappers ──────────────────────────────────────────────────────────────────

fn project_dto(row: ProjectRow) -> ProjectDto {
    ProjectDto {
        id: row.id,
        title: row.title,
        goal_text: row.goal_text,
        governance_mode: row.governance_mode,
        created_at: row.created_at,
        updated_at: row.updated_at,
    }
}

fn node_dto(row: GraphNodeRow) -> Result<GraphNodeDto, String> {
    let acceptance_criteria: Vec<String> =
        serde_json::from_str(&row.acceptance_criteria).unwrap_or_default();
    let metadata: serde_json::Value = serde_json::from_str(&row.metadata).unwrap_or_default();
    Ok(GraphNodeDto {
        id: row.id,
        project_id: row.project_id,
        node_type: row.node_type,
        parent_id: row.parent_id,
        title: row.title,
        description: row.description,
        status: row.status,
        acceptance_criteria,
        assigned_role: row.assigned_role,
        assigned_session_id: row.assigned_session_id,
        branch: row.branch,
        metadata,
        created_at: row.created_at,
        updated_at: row.updated_at,
    })
}

fn edge_dto(row: GraphEdgeRow) -> GraphEdgeDto {
    GraphEdgeDto {
        id: row.id,
        project_id: row.project_id,
        from_node_id: row.from_node_id,
        to_node_id: row.to_node_id,
        edge_type: row.edge_type,
    }
}

fn event_dto(row: EventRow) -> Result<StoredEventDto, String> {
    let payload: serde_json::Value = serde_json::from_str(&row.payload).unwrap_or_default();
    Ok(StoredEventDto {
        id: row.id,
        project_id: row.project_id,
        session_id: row.session_id,
        node_id: row.node_id,
        event_type: row.event_type,
        message: row.message,
        severity: row.severity,
        payload,
        timestamp: row.timestamp,
    })
}

fn session_dto(row: SessionRow) -> Result<StoredSessionDto, String> {
    let data: serde_json::Value = serde_json::from_str(&row.data).unwrap_or_default();
    Ok(StoredSessionDto {
        id: row.id,
        project_id: row.project_id,
        node_id: row.node_id,
        data,
        created_at: row.created_at,
        updated_at: row.updated_at,
    })
}

fn status_dto(status: StoreStatus) -> StoreStatusResult {
    StoreStatusResult {
        project_count: status.project_count,
        node_count: status.node_count,
        edge_count: status.edge_count,
        event_count: status.event_count,
        session_count: status.session_count,
    }
}

// ── Commands ─────────────────────────────────────────────────────────────────

#[tauri::command]
pub fn store_init(app: AppHandle) -> Result<StoreInitResult, String> {
    if DB.get().is_some() {
        let init = db()?.init_result()?;
        return Ok(StoreInitResult {
            available: init.available,
            db_path: init.db_path,
            schema_version: init.schema_version,
            is_empty: init.is_empty,
        });
    }

    let path = db_path(&app)?;
    let store = DbStore::open(path)?;
    let init = store.init_result()?;
    let _ = DB.set(store);

    Ok(StoreInitResult {
        available: init.available,
        db_path: init.db_path,
        schema_version: init.schema_version,
        is_empty: init.is_empty,
    })
}

#[tauri::command]
pub fn store_get_status() -> Result<StoreStatusResult, String> {
    Ok(status_dto(db()?.get_status()?))
}

#[tauri::command]
pub fn store_list_projects() -> Result<Vec<ProjectDto>, String> {
    Ok(db()?
        .list_projects()?
        .into_iter()
        .map(project_dto)
        .collect())
}

#[tauri::command]
pub fn store_create_project(input: CreateProjectInput) -> Result<ProjectDto, String> {
    let now = now_iso();
    let id = uid("proj");
    let mode = input.governance_mode.unwrap_or_else(|| "assisted".to_string());
    let row = db()?.create_project(&id, &input.title, &input.goal_text, &mode, &now)?;
    Ok(project_dto(row))
}

#[tauri::command]
pub fn store_update_project(input: UpdateProjectInput) -> Result<ProjectDto, String> {
    let now = now_iso();
    let row = db()?.update_project(
        &input.project_id,
        input.title.as_deref(),
        input.governance_mode.as_deref(),
        &now,
    )?;
    Ok(project_dto(row))
}

#[tauri::command]
pub fn store_get_project(project_id: String) -> Result<Option<ProjectWithGraphDto>, String> {
    let project = match db()?.get_project(&project_id)? {
        Some(p) => p,
        None => return Ok(None),
    };

    let nodes: Vec<GraphNodeDto> = db()?
        .list_nodes(&project_id)?
        .into_iter()
        .map(node_dto)
        .collect::<Result<Vec<_>, _>>()?;

    let edges: Vec<GraphEdgeDto> = db()?
        .list_edges(&project_id)?
        .into_iter()
        .map(edge_dto)
        .collect();

    Ok(Some(ProjectWithGraphDto {
        project: project_dto(project),
        nodes,
        edges,
    }))
}

#[tauri::command]
pub fn store_upsert_node(input: UpsertNodeInput) -> Result<GraphNodeDto, String> {
    let now = now_iso();
    let id = input.id.unwrap_or_else(|| uid("node"));
    let acceptance = serde_json::to_string(&input.acceptance_criteria.unwrap_or_default())
        .map_err(|e| e.to_string())?;
    let metadata = serde_json::to_string(&input.metadata.unwrap_or_default())
        .map_err(|e| e.to_string())?;

    let row = GraphNodeRow {
        id: id.clone(),
        project_id: input.project_id,
        node_type: input.node_type,
        parent_id: input.parent_id,
        title: input.title,
        description: input.description.unwrap_or_default(),
        status: input.status.unwrap_or_else(|| "pending".to_string()),
        acceptance_criteria: acceptance,
        assigned_role: input.assigned_role,
        assigned_session_id: input.assigned_session_id,
        branch: input.branch,
        metadata,
        created_at: now.clone(),
        updated_at: now,
    };

    db()?.upsert_node(&row)?;
    node_dto(row)
}

#[tauri::command]
pub fn store_delete_node(node_id: String) -> Result<(), String> {
    db()?.delete_node(&node_id)
}

#[tauri::command]
pub fn store_upsert_edge(input: UpsertEdgeInput) -> Result<GraphEdgeDto, String> {
    let id = input.id.unwrap_or_else(|| uid("edge"));
    let row = GraphEdgeRow {
        id: id.clone(),
        project_id: input.project_id,
        from_node_id: input.from_node_id,
        to_node_id: input.to_node_id,
        edge_type: input.edge_type.unwrap_or_else(|| "depends_on".to_string()),
    };
    db()?.upsert_edge(&row)?;
    Ok(edge_dto(row))
}

#[tauri::command]
pub fn store_delete_edge(edge_id: String) -> Result<(), String> {
    db()?.delete_edge(&edge_id)
}

#[tauri::command]
pub fn store_append_event(input: AppendEventInput) -> Result<StoredEventDto, String> {
    let now = now_iso();
    let id = uid("evt");
    let payload = serde_json::to_string(&input.payload.unwrap_or_default())
        .map_err(|e| e.to_string())?;

    let row = EventRow {
        id: id.clone(),
        project_id: input.project_id,
        session_id: input.session_id,
        node_id: input.node_id,
        event_type: input.event_type,
        message: input.message,
        severity: input.severity.unwrap_or_else(|| "info".to_string()),
        payload,
        timestamp: now,
    };

    db()?.append_event(&row)?;
    event_dto(row)
}

#[tauri::command]
pub fn store_list_events(input: ListEventsInput) -> Result<Vec<StoredEventDto>, String> {
    let limit = input.limit.unwrap_or(100);
    let offset = input.offset.unwrap_or(0);
    let rows = db()?.list_events(input.project_id.as_deref(), limit, offset)?;
    rows.into_iter().map(event_dto).collect()
}

#[tauri::command]
pub fn store_upsert_session(input: UpsertSessionInput) -> Result<StoredSessionDto, String> {
    let now = now_iso();
    let id = input.id.unwrap_or_else(|| uid("sess"));
    let data = serde_json::to_string(&input.data).map_err(|e| e.to_string())?;

    let row = SessionRow {
        id: id.clone(),
        project_id: input.project_id,
        node_id: input.node_id,
        data,
        created_at: now.clone(),
        updated_at: now,
    };

    db()?.upsert_session(&row)?;
    session_dto(row)
}

#[tauri::command]
pub fn store_list_sessions(project_id: String) -> Result<Vec<StoredSessionDto>, String> {
    let rows = db()?.list_sessions(&project_id)?;
    rows.into_iter().map(session_dto).collect()
}
