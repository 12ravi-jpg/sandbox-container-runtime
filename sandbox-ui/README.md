# Sandbox Container UI

A React + Vite dashboard for the Rust sandbox container runtime.

## Run
Start the Rust API first from the repository root:

```bash
cargo run
```

Then run the UI:

```bash
npm run dev
```

Open the Vite URL, usually `http://localhost:5173`.

## Configuration
- `VITE_API_URL` defaults to `http://localhost:3000`.

Example:

```bash
VITE_API_URL=http://localhost:3000 npm run dev
```
