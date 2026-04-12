use actix_cors::Cors;
use actix_web::{App, HttpResponse, HttpServer, Responder, get, post, web};
use rusqlite::{Connection, params};
use serde::Serialize;
use std::env;
use std::path::PathBuf;
use std::time::{Instant, SystemTime, UNIX_EPOCH};

#[derive(Clone)]
struct AppState {
    db_path: PathBuf,
}

#[derive(Serialize)]
struct ApiHealth {
    status: &'static str,
    database: String,
    rootfs_ready: bool,
    rootfs_path: String,
}

#[derive(Serialize)]
struct RunRecord {
    id: i64,
    status: String,
    logs: String,
    created_at: i64,
    duration_ms: i64,
}

fn database_path() -> PathBuf {
    env::var_os("SANDBOX_DB_PATH")
        .map(PathBuf::from)
        .unwrap_or_else(|| {
            env::current_dir()
                .unwrap_or_else(|_| PathBuf::from("."))
                .join("sandbox.db")
        })
}

fn init_database(db_path: &PathBuf) -> rusqlite::Result<()> {
    let conn = Connection::open(db_path)?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS runs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            status TEXT NOT NULL,
            logs TEXT NOT NULL,
            created_at INTEGER NOT NULL,
            duration_ms INTEGER NOT NULL
        )",
        [],
    )?;

    Ok(())
}

fn created_at_now() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_secs() as i64)
        .unwrap_or_default()
}

#[get("/")]
async fn home() -> impl Responder {
    HttpResponse::Ok().body("Sandbox Container API Running")
}

#[get("/health")]
async fn health(data: web::Data<AppState>) -> impl Responder {
    let rootfs_path = crate::sandbox_root_path();
    let rootfs_ready = rootfs_path.join("bin").join("busybox").exists();

    HttpResponse::Ok().json(ApiHealth {
        status: "ok",
        database: data.db_path.to_string_lossy().to_string(),
        rootfs_ready,
        rootfs_path: rootfs_path.to_string_lossy().to_string(),
    })
}

#[post("/run")]
async fn run_container_api(data: web::Data<AppState>) -> impl Responder {
    let started_at = Instant::now();
    let created_at = created_at_now();
    let output = crate::run_container();
    let duration_ms = started_at.elapsed().as_millis() as i64;
    let status =
        if output.to_lowercase().contains("failed") || output.to_lowercase().contains("error") {
            "failed"
        } else {
            "completed"
        };

    let conn = match Connection::open(&data.db_path) {
        Ok(conn) => conn,
        Err(error) => {
            return HttpResponse::InternalServerError()
                .body(format!("Failed to open sandbox database: {error}"));
        }
    };

    if let Err(error) = conn.execute(
        "INSERT INTO runs (status, logs, created_at, duration_ms) VALUES (?1, ?2, ?3, ?4)",
        params![status, &output, created_at, duration_ms],
    ) {
        return HttpResponse::InternalServerError()
            .body(format!("Failed to save sandbox run: {error}"));
    }

    let id = conn.last_insert_rowid();

    HttpResponse::Ok().json(RunRecord {
        id,
        status: status.to_string(),
        logs: output,
        created_at,
        duration_ms,
    })
}

#[get("/runs")]
async fn list_runs(data: web::Data<AppState>) -> impl Responder {
    let conn = match Connection::open(&data.db_path) {
        Ok(conn) => conn,
        Err(error) => {
            return HttpResponse::InternalServerError()
                .body(format!("Failed to open sandbox database: {error}"));
        }
    };

    let mut statement = match conn.prepare(
        "SELECT id, status, logs, created_at, duration_ms
         FROM runs
         ORDER BY id DESC
         LIMIT 12",
    ) {
        Ok(statement) => statement,
        Err(error) => {
            return HttpResponse::InternalServerError()
                .body(format!("Failed to read sandbox runs: {error}"));
        }
    };

    let records = match statement.query_map([], |row| {
        Ok(RunRecord {
            id: row.get(0)?,
            status: row.get(1)?,
            logs: row.get(2)?,
            created_at: row.get(3)?,
            duration_ms: row.get(4)?,
        })
    }) {
        Ok(records) => records,
        Err(error) => {
            return HttpResponse::InternalServerError()
                .body(format!("Failed to map sandbox runs: {error}"));
        }
    };

    let runs: rusqlite::Result<Vec<RunRecord>> = records.collect();

    match runs {
        Ok(runs) => HttpResponse::Ok().json(runs),
        Err(error) => HttpResponse::InternalServerError()
            .body(format!("Failed to collect sandbox runs: {error}")),
    }
}

#[post("/stop")]
async fn stop_container() -> impl Responder {
    HttpResponse::Ok().body("Container stop requested")
}

pub async fn start_server() -> std::io::Result<()> {
    let db_path = database_path();

    init_database(&db_path).map_err(|error| {
        std::io::Error::new(
            std::io::ErrorKind::Other,
            format!("failed to initialize sandbox database: {error}"),
        )
    })?;

    let state = web::Data::new(AppState { db_path });

    HttpServer::new(move || {
        App::new()
            .app_data(state.clone())
            .wrap(Cors::permissive())
            .service(home)
            .service(health)
            .service(run_container_api)
            .service(list_runs)
            .service(stop_container)
    })
    .bind(("127.0.0.1", 3000))?
    .run()
    .await
}
