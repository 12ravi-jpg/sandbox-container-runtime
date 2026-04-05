use libc::{clone, waitpid, SIGCHLD, CLONE_NEWPID, CLONE_NEWNS};
use std::ptr;
use std::ffi::CString;

extern "C" fn child_func(_arg: *mut libc::c_void) -> i32 {
    println!("Inside child process!");

    let pid = unsafe { libc::getpid() };
    println!("Child PID inside namespace: {}", pid);

    let new_root = CString::new("/Users/ravikumar/sandbox_container/rootfs").unwrap();

    unsafe {
        if libc::chroot(new_root.as_ptr()) != 0 {
            eprintln!("chroot failed");
            return -1;
        }
    }

    unsafe {
        libc::chdir(b"/\0".as_ptr() as *const libc::c_char);
    }

    println!("After chroot, listing /:");

    let cmd = CString::new("/bin/busybox").unwrap();

    let arg0 = CString::new("busybox").unwrap();
    let arg1 = CString::new("ls").unwrap();
    let arg2 = CString::new("/").unwrap();

    let args = [
        arg0.as_ptr(),
        arg1.as_ptr(),
        arg2.as_ptr(),
        ptr::null(),
    ];

    unsafe {
        libc::execv(cmd.as_ptr(), args.as_ptr());
    }

    eprintln!("execv failed");
    0
}

fn main() {
    const STACK_SIZE: usize = 1024 * 1024;
    let mut stack = vec![0u8; STACK_SIZE];

    let stack_top = unsafe { stack.as_mut_ptr().add(STACK_SIZE) };

    let flags = CLONE_NEWPID | CLONE_NEWNS | SIGCHLD;

    let pid = unsafe {
        clone(
            child_func,
            stack_top as *mut _,
            flags,
            ptr::null_mut(),
        )
    };

    if pid < 0 {
        eprintln!("clone failed");
    } else {
        println!("Created child with PID: {}", pid);

        unsafe {
            waitpid(pid, ptr::null_mut(), 0);
        }
    }
}