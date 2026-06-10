use rusqlite::Connection;

pub const SCHEMA_VERSION: i32 = 1;

pub fn migrate(conn: &Connection) -> Result<(), rusqlite::Error> {
    let version: i32 = conn.pragma_query_value(None, "user_version", |row| row.get(0))?;

    if version < 1 {
        conn.execute_batch(
            r#"
            CREATE TABLE IF NOT EXISTS projects (
                id               TEXT PRIMARY KEY NOT NULL,
                title            TEXT NOT NULL,
                goal_text        TEXT NOT NULL DEFAULT '',
                governance_mode  TEXT NOT NULL DEFAULT 'assisted',
                created_at       TEXT NOT NULL,
                updated_at       TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS graph_nodes (
                id                   TEXT PRIMARY KEY NOT NULL,
                project_id           TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
                node_type            TEXT NOT NULL,
                parent_id            TEXT,
                title                TEXT NOT NULL,
                description          TEXT NOT NULL DEFAULT '',
                status               TEXT NOT NULL DEFAULT 'pending',
                acceptance_criteria  TEXT NOT NULL DEFAULT '[]',
                assigned_role        TEXT,
                assigned_session_id  TEXT,
                branch               TEXT,
                metadata             TEXT NOT NULL DEFAULT '{}',
                created_at           TEXT NOT NULL,
                updated_at           TEXT NOT NULL
            );

            CREATE INDEX IF NOT EXISTS idx_graph_nodes_project ON graph_nodes(project_id);

            CREATE TABLE IF NOT EXISTS graph_edges (
                id            TEXT PRIMARY KEY NOT NULL,
                project_id    TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
                from_node_id  TEXT NOT NULL,
                to_node_id    TEXT NOT NULL,
                edge_type     TEXT NOT NULL DEFAULT 'depends_on'
            );

            CREATE INDEX IF NOT EXISTS idx_graph_edges_project ON graph_edges(project_id);
            CREATE INDEX IF NOT EXISTS idx_graph_edges_from ON graph_edges(from_node_id);

            CREATE TABLE IF NOT EXISTS events (
                id          TEXT PRIMARY KEY NOT NULL,
                project_id  TEXT,
                session_id  TEXT,
                node_id     TEXT,
                event_type  TEXT NOT NULL,
                message     TEXT NOT NULL,
                severity    TEXT NOT NULL DEFAULT 'info',
                payload     TEXT NOT NULL DEFAULT '{}',
                timestamp   TEXT NOT NULL
            );

            CREATE INDEX IF NOT EXISTS idx_events_project ON events(project_id);
            CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp DESC);

            CREATE TABLE IF NOT EXISTS sessions (
                id          TEXT PRIMARY KEY NOT NULL,
                project_id  TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
                node_id     TEXT,
                data        TEXT NOT NULL DEFAULT '{}',
                created_at  TEXT NOT NULL,
                updated_at  TEXT NOT NULL
            );

            CREATE INDEX IF NOT EXISTS idx_sessions_project ON sessions(project_id);
            "#,
        )?;
        conn.pragma_update(None, "user_version", &1)?;
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn migration_creates_tables() {
        let conn = Connection::open_in_memory().unwrap();
        migrate(&conn).unwrap();

        let version: i32 = conn
            .pragma_query_value(None, "user_version", |row| row.get(0))
            .unwrap();
        assert_eq!(version, SCHEMA_VERSION);

        let tables: Vec<String> = conn
            .prepare(
                "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
            )
            .unwrap()
            .query_map([], |row| row.get(0))
            .unwrap()
            .filter_map(|r| r.ok())
            .collect();

        assert!(tables.contains(&"projects".to_string()));
        assert!(tables.contains(&"graph_nodes".to_string()));
        assert!(tables.contains(&"graph_edges".to_string()));
        assert!(tables.contains(&"events".to_string()));
        assert!(tables.contains(&"sessions".to_string()));
    }
}
