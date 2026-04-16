# Stage 1: Build the Rust application
FROM rust:1.80 as builder

WORKDIR /usr/src/app

# Install dependencies needed for SQLite
RUN apt-get update && apt-get install -y pkg-config libsqlite3-dev

# Copy the manifest files
COPY Cargo.toml ./

# Create a dummy src/main.rs to build dependencies and cache them
RUN mkdir src && echo "fn main() {}" > src/main.rs
RUN cargo build --release
RUN rm -rf src

# Now copy the actual source code
COPY src ./src

# Update timestamps to ensure cargo rebuilt the app
RUN touch src/main.rs
RUN cargo build --release

# Stage 2: Create the minimal execution environment
FROM debian:bookworm-slim

WORKDIR /app

# Install dependencies required by the Rust binary and the sandbox rootfs
RUN apt-get update && apt-get install -y \
    ca-certificates \
    libsqlite3-0 \
    busybox \
    && rm -rf /var/lib/apt/lists/*

# Copy the compiled binary from the builder stage
COPY --from=builder /usr/src/app/target/release/sandbox_container /usr/local/bin/sandbox_container

# Set the Hugging Face requested port
ENV PORT=7860
EXPOSE 7860

# We bind to 0.0.0.0:7860 internally
CMD ["sandbox_container"]
