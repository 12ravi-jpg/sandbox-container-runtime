use actix_cors::Cors;
use actix_web::{App, HttpResponse, HttpServer, Responder, get, post, web};
use libc::{rlimit, RLIMIT_AS, RLIMIT_CPU};
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use std::env;
use std::ffi::CString;
use std::fs::File;
use std::io::Read;
use std::os::fd::FromRawFd;
use std::path::PathBuf;
use std::ptr;
use std::time::{Instant, SystemTime, UNIX_EPOCH};

#[derive(Clone)]
struct AppState {
    db_path: PathBuf,
}

#[derive(Deserialize)]
pub struct RunPayload {
    pub script: String,
    pub mem_limit_mb: Option<u64>,
    pub cpu_limit_secs: Option<u64>,
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
        .unwrap_or_else(|| env::current_dir().unwrap_or_else(|_| PathBuf::from(".")).join("sandbox.db"))
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

pub fn run_container(script: &str, cpu_limit_secs: Option<u64>, ram_limit_mb: Option<u64>) -> String {
    let mut logs = String::new();

    unsafe {
        let mut pipe_fds = [0; 2];
        if libc::pipe(pipe_fds.as_mut_ptr()) != 0 {
            logs.push_str("Failed to create output pipe\n");
            return logs;
        }

        let pid = libc::fork();
        if pid < 0 {
            libc::close(pipe_fds[0]);
            libc::close(pipe_fds[1]);
            logs.push_str("Fork failed\n");
            return logs;
        }

        if pid == 0 {
            libc::close(pipe_fds[0]);
            libc::dup2(pipe_fds[1], libc::STDOUT_FILENO);
            libc::dup2(pipe_fds[1], libc::STDERR_FILENO);
            libc::close(pipe_fds[1]);

            if let Some(cpu) = cpu_limit_secs {
                let rlim = rlimit {
                    rlim_cur: cpu,
                    rlim_max: cpu,
                };
                libc::setrlimit(RLIMIT_CPU, &rlim);
            }

            if let Some(ram) = ram_limit_mb {
                let bytes = ram * 1024 * 1024;
                let rlim = rlimit {
                    rlim_cur: bytes,
                    rlim_max: bytes,
                };
                libc::setrlimit(RLIMIT_AS, &rlim);
            }

            let cmd = CString::new("/bin/sh").unwrap();
            let arg0 = CString::new("sh").unwrap();
            let arg1 = CString::new("-c").unwrap();
            let arg2 = CString::new(script).unwrap();

            let args = [arg0.as_ptr(), arg1.as_ptr(), arg2.as_ptr(), ptr::null()];
            libc::execv(cmd.as_ptr(), args.as_ptr());

            eprintln!("exec failed (did the script crash or /bin/sh not exist?)");
            std::process::exit(1);
        } else {
            libc::close(pipe_fds[1]);

            libc::waitpid(pid, ptr::null_mut(), 0);

            let mut output = String::new();
            let mut reader = File::from_raw_fd(pipe_fds[0]);
            if reader.read_to_string(&mut output).is_ok() {
                logs.push_str(&output);
            }
        }
    }
    logs
}

#[get("/")]
async fn home() -> impl Responder {
    HttpResponse::Ok().body("Sandbox API is running")
}

#[post("/run")]
async fn run_endpoint(data: web::Data<AppState>, payload: web::Json<RunPayload>) -> impl Responder {
    let started_at = Instant::now();
    let created_at = created_at_now();
    
    let output = run_container(&payload.script, payload.cpu_limit_secs, payload.mem_limit_mb);
    let duration_ms = started_at.elapsed().as_millis() as i64;
    
    let status = if output.to_lowercase().contains("exec failed") {
        "failed"
    } else {
        "completed"
    };

    let conn = match Connection::open(&data.db_path) {
        Ok(c) => c,
        Err(e) => return HttpResponse::InternalServerError().body(format!("DB error: {}", e)),
    };

    if let Err(e) = conn.execute(
        "INSERT INTO runs (status, logs, created_at, duration_ms) VALUES (?1, ?2, ?3, ?4)",
        params![status, &output, created_at, duration_ms],
    ) {
        return HttpResponse::InternalServerError().body(format!("DB insert error: {}", e));
    }

    HttpResponse::Ok().json(RunRecord {
        id: conn.last_insert_rowid(),
        status: status.to_string(),
        logs: output,
        created_at,
        duration_ms,
    })
}

#[get("/runs")]
async fn list_runs(data: web::Data<AppState>) -> impl Responder {
    let conn = match Connection::open(&data.db_path) {
        Ok(c) => c,
        Err(e) => return HttpResponse::InternalServerError().body(format!("DB error: {}", e)),
    };

    let mut stmt = match conn.prepare("SELECT id, status, logs, created_at, duration_ms FROM runs ORDER BY id DESC LIMIT 10") {
        Ok(s) => s,
        Err(e) => return HttpResponse::InternalServerError().body(format!("DB stmt error: {}", e)),
    };

    let records = match stmt.query_map([], |row| {
        Ok(RunRecord {
            id: row.get(0)?,
            status: row.get(1)?,
            logs: row.get(2)?,
            created_at: row.get(3)?,
            duration_ms: row.get(4)?,
        })
    }) {
        Ok(r) => r,
        Err(e) => return HttpResponse::InternalServerError().body(format!("DB query error: {}", e)),
    };

    let runs: rusqlite::Result<Vec<RunRecord>> = records.collect();
    match runs {
        Ok(r) => HttpResponse::Ok().json(r),
        Err(e) => HttpResponse::InternalServerError().body(format!("DB collect error: {}", e)),
    }
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    let db_path = database_path();
    if let Err(e) = init_database(&db_path) {
        eprintln!("Failed to initialize db: {}", e);
        return Err(std::io::Error::new(std::io::ErrorKind::Other, "DB init failed"));
    }

    let state = web::Data::new(AppState { db_path });

    println!("Starting server on 0.0.0.0:7860");

    HttpServer::new(move || {
        App::new()
            .app_data(state.clone())
            .wrap(Cors::permissive())
            .service(home)
            .service(run_endpoint)
            .service(list_runs)
    })
    .bind(("0.0.0.0", 7860))?
    .run()
    .await
}
