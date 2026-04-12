# Sandbox Container Runtime

A lightweight container runtime built from scratch with Rust, a local SQLite run database, and a React dashboard.

## Features
- Filesystem isolation using `chroot`
- Process execution using `fork` and `execv`
- Captured sandbox stdout/stderr logs
- SQLite-backed run history in `sandbox.db`
- Actix Web API for health, runs, and execution
- React + Vite frontend for launching and reviewing runs

## Tech Stack
- Rust
- Actix Web
- SQLite
- React + Vite + Tailwind CSS
- Linux-style root filesystem in `rootfs/`

## Run Locally
Start the API from the repository root:

```bash
cargo run
```

If your local `target/` folder contains root-owned build artifacts, use a clean target directory:

```bash
CARGO_TARGET_DIR=/tmp/sandbox_container_target cargo run
```

The sandbox uses `chroot`, so an actual container run may require elevated permissions:

```bash
sudo CARGO_TARGET_DIR=/tmp/sandbox_container_target cargo run
```

Start the frontend in another terminal:

```bash
cd sandbox-ui
npm run dev
```

Then open the Vite URL, usually `http://localhost:5173`.

## API
- `GET /health` checks database and rootfs readiness.
- `GET /runs` returns the latest saved sandbox runs from `sandbox.db`.
- `POST /run` runs the sandbox and saves logs to SQLite.
- `POST /stop` is reserved for stop requests.

## Configuration
- `SANDBOX_ROOTFS=/path/to/rootfs` overrides the default `./rootfs`.
- `SANDBOX_DB_PATH=/path/to/sandbox.db` overrides the default `./sandbox.db`.
- `VITE_API_URL=http://localhost:3000` points the frontend at a custom API URL.

## Sample Output
```text
Created child with PID: 12345
Inside sandbox child process
After chroot, listing sandbox root:
bin
lib
Container finished execution
```
