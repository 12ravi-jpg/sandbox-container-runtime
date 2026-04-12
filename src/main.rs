use std::env;
use std::ffi::CString;
use std::fs::File;
use std::io::Read;
use std::os::fd::FromRawFd;
use std::path::PathBuf;
use std::ptr;

mod api;

pub fn sandbox_root_path() -> PathBuf {
    env::var_os("SANDBOX_ROOTFS")
        .map(PathBuf::from)
        .unwrap_or_else(|| {
            env::current_dir()
                .unwrap_or_else(|_| PathBuf::from("."))
                .join("rootfs")
        })
}

pub fn run_container() -> String {
    let mut logs = String::new();
    let rootfs = sandbox_root_path();

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

            println!("Inside sandbox child process");

            let new_root = CString::new(rootfs.to_string_lossy().as_bytes()).unwrap();

            if libc::chroot(new_root.as_ptr()) != 0 {
                eprintln!("chroot failed. Try running the API with sudo or check SANDBOX_ROOTFS.");
                std::process::exit(1);
            }

            libc::chdir(b"/\0".as_ptr() as *const i8);

            println!("After chroot, listing sandbox root:");

            let cmd = CString::new("/bin/busybox").unwrap();
            let arg0 = CString::new("busybox").unwrap();
            let arg1 = CString::new("ls").unwrap();
            let arg2 = CString::new("/").unwrap();

            let args = [arg0.as_ptr(), arg1.as_ptr(), arg2.as_ptr(), ptr::null()];

            libc::execv(cmd.as_ptr(), args.as_ptr());

            eprintln!("exec failed");
            std::process::exit(1);
        } else {
            libc::close(pipe_fds[1]);

            logs.push_str(&format!("Created child with PID: {}\n", pid));

            libc::waitpid(pid, ptr::null_mut(), 0);

            let mut output = String::new();
            let mut reader = File::from_raw_fd(pipe_fds[0]);
            if reader.read_to_string(&mut output).is_ok() {
                logs.push_str(&output);
            }

            logs.push_str("Container finished execution\n");
        }
    }

    logs
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    api::start_server().await
}
