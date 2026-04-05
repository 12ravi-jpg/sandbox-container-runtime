# Sandbox Container Runtime

A lightweight container runtime built from scratch using Rust and Linux kernel features.

## 🚀 Features
- PID namespace isolation
- Mount namespace isolation
- Filesystem isolation using chroot
- Process execution using execv
- Resource control using cgroups (systemd)

## 🛠 Tech Stack
- Rust
- Linux (Namespaces, cgroups)
- Colima

## ▶️ Run
cargo run

## 📌 Sample Output
Inside child process!
Child PID inside namespace: 1
After chroot, listing /:
bin lib
