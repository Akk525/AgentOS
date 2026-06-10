use super::schema::{self, SCHEMA_VERSION};
use rusqlite::{params, Connection, OptionalExtension};
use std::path::PathBuf;
use std::sync::Mutex;

pub struct DbStore {
    conn: Mutex<Connection>,
    pub db_path: PathBuf,
}

#[derive(Debug, Clone)]
pub struct InitResult {
    pub available: bool,
    pub db_path: String,
    pub schema_version: i32,
    pub is_empty: bool,
}

#[derive(Debug, Clone, Default)]
pub struct StoreStatus {
    pub project_count: u32,
    pub node_count: u32,
    pub edge_count: u32,
    pub event_count: u32,
    pub session_count: u32,
}

#[derive(Debug, Clone)]
pub struct ProjectRow {
    pub id: String,
    pub title: String,
    pub goal_text: String,
    pub governance_mode: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone)]
pub struct GraphNodeRow {
    pub id: String,
    pub project_id: String,
    pub node_type: String,
    pub parent_id: Option<String>,
    pub title: String,
    pub description: String,
    pub status: String,
    pub acceptance_criteria: String,
    pub assigned_role: Option<String>,
    pub assigned_session_id: Option<String>,
    pub branch: Option<String>,
    pub metadata: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone)]
pub struct GraphEdgeRow {
    pub id: String,
    pub project_id: String,
    pub from_node_id: String,
    pub to_node_id: String,
    pub edge_type: String,
}

#[derive(Debug, Clone)]
pub struct EventRow {
    pub id: String,
    pub project_id: Option<String>,
    pub session_id: Option<String>,
    pub node_id: Option<String>,
    pub event_type: String,
    pub message: String,
    pub severity: String,
    pub payload: String,
    pub timestamp: String,
}

#[derive(Debug, Clone)]
pub struct SessionRow {
    pub id: String,
    pub project_id: String,
    pub node_id: Option<String>,
    pub data: String,
    pub created_at: String,
    pub updated_at: String,
}

impl DbStore {
    pub fn open(db_path: PathBuf) -> Result<Self, String> {
        if let Some(parent) = db_path.parent() {
            std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }

        let conn = Connection::open(&db_path).map_err(|e| e.to_string())?;
        conn.execute("PRAGMA foreign_keys = ON", [])
            .map_err(|e| e.to_string())?;
        schema::migrate(&conn).map_err(|e| e.to_string())?;

        Ok(Self {
            conn: Mutex::new(conn),
            db_path,
        })
    }

    pub fn init_result(&self) -> Result<InitResult, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        let is_empty = Self::is_empty(&conn)?;
        Ok(InitResult {
            available: true,
            db_path: self.db_path.to_string_lossy().to_string(),
            schema_version: SCHEMA_VERSION,
            is_empty,
        })
    }

    fn is_empty(conn: &Connection) -> Result<bool, String> {
        let count: i64 = conn
            .query_row("SELECT COUNT(*) FROM projects", [], |row| row.get(0))
            .map_err(|e| e.to_string())?;
        Ok(count == 0)
    }

    pub fn get_status(&self) -> Result<StoreStatus, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        Ok(StoreStatus {
            project_count: count_table(&conn, "projects")?,
            node_count: count_table(&conn, "graph_nodes")?,
            edge_count: count_table(&conn, "graph_edges")?,
            event_count: count_table(&conn, "events")?,
            session_count: count_table(&conn, "sessions")?,
        })
    }

    pub fn list_projects(&self) -> Result<Vec<ProjectRow>, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        let mut stmt = conn
            .prepare(
                "SELECT id, title, goal_text, governance_mode, created_at, updated_at FROM projects ORDER BY created_at DESC",
            )
            .map_err(|e| e.to_string())?;

        let rows = stmt
            .query_map([], |row| {
                Ok(ProjectRow {
                    id: row.get(0)?,
                    title: row.get(1)?,
                    goal_text: row.get(2)?,
                    governance_mode: row.get(3)?,
                    created_at: row.get(4)?,
                    updated_at: row.get(5)?,
                })
            })
            .map_err(|e| e.to_string())?
            .filter_map(|r| r.ok())
            .collect();

        Ok(rows)
    }

    pub fn create_project(
        &self,
        id: &str,
        title: &str,
        goal_text: &str,
        governance_mode: &str,
        now: &str,
    ) -> Result<ProjectRow, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        conn.execute(
            "INSERT INTO projects (id, title, goal_text, governance_mode, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![id, title, goal_text, governance_mode, now, now],
        )
        .map_err(|e| e.to_string())?;

        Ok(ProjectRow {
            id: id.to_string(),
            title: title.to_string(),
            goal_text: goal_text.to_string(),
            governance_mode: governance_mode.to_string(),
            created_at: now.to_string(),
            updated_at: now.to_string(),
        })
    }

    pub fn get_project(&self, project_id: &str) -> Result<Option<ProjectRow>, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        conn.query_row(
            "SELECT id, title, goal_text, governance_mode, created_at, updated_at FROM projects WHERE id = ?1",
            params![project_id],
            |row| {
                Ok(ProjectRow {
                    id: row.get(0)?,
                    title: row.get(1)?,
                    goal_text: row.get(2)?,
                    governance_mode: row.get(3)?,
                    created_at: row.get(4)?,
                    updated_at: row.get(5)?,
                })
            },
        )
        .optional()
        .map_err(|e| e.to_string())
    }

    pub fn list_nodes(&self, project_id: &str) -> Result<Vec<GraphNodeRow>, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        let mut stmt = conn
            .prepare(
                "SELECT id, project_id, node_type, parent_id, title, description, status, acceptance_criteria, assigned_role, assigned_session_id, branch, metadata, created_at, updated_at FROM graph_nodes WHERE project_id = ?1 ORDER BY created_at ASC",
            )
            .map_err(|e| e.to_string())?;

        let rows = stmt
            .query_map(params![project_id], map_graph_node)
            .map_err(|e| e.to_string())?
            .filter_map(|r| r.ok())
            .collect();

        Ok(rows)
    }

    pub fn upsert_node(&self, node: &GraphNodeRow) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        conn.execute(
            r#"INSERT INTO graph_nodes (
                id, project_id, node_type, parent_id, title, description, status,
                acceptance_criteria, assigned_role, assigned_session_id, branch,
                metadata, created_at, updated_at
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14)
            ON CONFLICT(id) DO UPDATE SET
                node_type = excluded.node_type,
                parent_id = excluded.parent_id,
                title = excluded.title,
                description = excluded.description,
                status = excluded.status,
                acceptance_criteria = excluded.acceptance_criteria,
                assigned_role = excluded.assigned_role,
                assigned_session_id = excluded.assigned_session_id,
                branch = excluded.branch,
                metadata = excluded.metadata,
                updated_at = excluded.updated_at"#,
            params![
                node.id,
                node.project_id,
                node.node_type,
                node.parent_id,
                node.title,
                node.description,
                node.status,
                node.acceptance_criteria,
                node.assigned_role,
                node.assigned_session_id,
                node.branch,
                node.metadata,
                node.created_at,
                node.updated_at,
            ],
        )
        .map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn delete_node(&self, node_id: &str) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        conn.execute("DELETE FROM graph_nodes WHERE id = ?1", params![node_id])
            .map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn list_edges(&self, project_id: &str) -> Result<Vec<GraphEdgeRow>, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        let mut stmt = conn
            .prepare(
                "SELECT id, project_id, from_node_id, to_node_id, edge_type FROM graph_edges WHERE project_id = ?1",
            )
            .map_err(|e| e.to_string())?;

        let rows = stmt
            .query_map(params![project_id], |row| {
                Ok(GraphEdgeRow {
                    id: row.get(0)?,
                    project_id: row.get(1)?,
                    from_node_id: row.get(2)?,
                    to_node_id: row.get(3)?,
                    edge_type: row.get(4)?,
                })
            })
            .map_err(|e| e.to_string())?
            .filter_map(|r| r.ok())
            .collect();

        Ok(rows)
    }

    pub fn upsert_edge(&self, edge: &GraphEdgeRow) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        conn.execute(
            r#"INSERT INTO graph_edges (id, project_id, from_node_id, to_node_id, edge_type)
               VALUES (?1, ?2, ?3, ?4, ?5)
               ON CONFLICT(id) DO UPDATE SET
                 from_node_id = excluded.from_node_id,
                 to_node_id = excluded.to_node_id,
                 edge_type = excluded.edge_type"#,
            params![
                edge.id,
                edge.project_id,
                edge.from_node_id,
                edge.to_node_id,
                edge.edge_type,
            ],
        )
        .map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn delete_edge(&self, edge_id: &str) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        conn.execute("DELETE FROM graph_edges WHERE id = ?1", params![edge_id])
            .map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn append_event(&self, event: &EventRow) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        conn.execute(
            r#"INSERT INTO events (id, project_id, session_id, node_id, event_type, message, severity, payload, timestamp)
               VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)"#,
            params![
                event.id,
                event.project_id,
                event.session_id,
                event.node_id,
                event.event_type,
                event.message,
                event.severity,
                event.payload,
                event.timestamp,
            ],
        )
        .map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn list_events(
        &self,
        project_id: Option<&str>,
        limit: u32,
        offset: u32,
    ) -> Result<Vec<EventRow>, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;

        let rows: Vec<EventRow> = if let Some(pid) = project_id {
            let mut stmt = conn
                .prepare(
                    "SELECT id, project_id, session_id, node_id, event_type, message, severity, payload, timestamp FROM events WHERE project_id = ?1 ORDER BY timestamp DESC LIMIT ?2 OFFSET ?3",
                )
                .map_err(|e| e.to_string())?;
            let mapped = stmt
                .query_map(params![pid, limit, offset], map_event)
                .map_err(|e| e.to_string())?;
            mapped.filter_map(|r| r.ok()).collect()
        } else {
            let mut stmt = conn
                .prepare(
                    "SELECT id, project_id, session_id, node_id, event_type, message, severity, payload, timestamp FROM events ORDER BY timestamp DESC LIMIT ?1 OFFSET ?2",
                )
                .map_err(|e| e.to_string())?;
            let mapped = stmt
                .query_map(params![limit, offset], map_event)
                .map_err(|e| e.to_string())?;
            mapped.filter_map(|r| r.ok()).collect()
        };

        Ok(rows)
    }

    pub fn upsert_session(&self, session: &SessionRow) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        conn.execute(
            r#"INSERT INTO sessions (id, project_id, node_id, data, created_at, updated_at)
               VALUES (?1, ?2, ?3, ?4, ?5, ?6)
               ON CONFLICT(id) DO UPDATE SET
                 node_id = excluded.node_id,
                 data = excluded.data,
                 updated_at = excluded.updated_at"#,
            params![
                session.id,
                session.project_id,
                session.node_id,
                session.data,
                session.created_at,
                session.updated_at,
            ],
        )
        .map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn list_sessions(&self, project_id: &str) -> Result<Vec<SessionRow>, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        let mut stmt = conn
            .prepare(
                "SELECT id, project_id, node_id, data, created_at, updated_at FROM sessions WHERE project_id = ?1 ORDER BY updated_at DESC",
            )
            .map_err(|e| e.to_string())?;

        let rows = stmt
            .query_map(params![project_id], |row| {
                Ok(SessionRow {
                    id: row.get(0)?,
                    project_id: row.get(1)?,
                    node_id: row.get(2)?,
                    data: row.get(3)?,
                    created_at: row.get(4)?,
                    updated_at: row.get(5)?,
                })
            })
            .map_err(|e| e.to_string())?
            .filter_map(|r| r.ok())
            .collect();

        Ok(rows)
    }
}

fn count_table(conn: &Connection, table: &str) -> Result<u32, String> {
    let sql = format!("SELECT COUNT(*) FROM {table}");
    conn.query_row(&sql, [], |row| row.get::<_, i64>(0))
        .map(|c| c as u32)
        .map_err(|e| e.to_string())
}

fn map_graph_node(row: &rusqlite::Row<'_>) -> rusqlite::Result<GraphNodeRow> {
    Ok(GraphNodeRow {
        id: row.get(0)?,
        project_id: row.get(1)?,
        node_type: row.get(2)?,
        parent_id: row.get(3)?,
        title: row.get(4)?,
        description: row.get(5)?,
        status: row.get(6)?,
        acceptance_criteria: row.get(7)?,
        assigned_role: row.get(8)?,
        assigned_session_id: row.get(9)?,
        branch: row.get(10)?,
        metadata: row.get(11)?,
        created_at: row.get(12)?,
        updated_at: row.get(13)?,
    })
}

fn map_event(row: &rusqlite::Row<'_>) -> rusqlite::Result<EventRow> {
    Ok(EventRow {
        id: row.get(0)?,
        project_id: row.get(1)?,
        session_id: row.get(2)?,
        node_id: row.get(3)?,
        event_type: row.get(4)?,
        message: row.get(5)?,
        severity: row.get(6)?,
        payload: row.get(7)?,
        timestamp: row.get(8)?,
    })
}
