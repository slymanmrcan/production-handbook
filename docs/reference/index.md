# Reference Portal

This page is the entry point for command references. Use it when you need a fast operational answer instead of a long how-to guide.

## How To Use

1. Start with the command family that matches the problem.
2. Use the quick triage commands first.
3. Move to the deeper inspection commands only after you know the failure domain.
4. Treat the reference pages as operator cheat sheets, not full tutorials.

## Command Families

### File Operations

Use [file commands](commands/file.md) when you need to inspect ownership, permissions, content, or basic file metadata.

Typical questions:

- Who owns this file?
- Is the mode too open?
- What changed in this directory?

### Disk Operations

Use [disk commands](commands/disk.md) for capacity, inode, mount, and block-device checks.

Typical questions:

- Is the disk full?
- Is the mount point healthy?
- Is a block device saturated?

### Network Operations

Use [network commands](commands/network.md) for ports, DNS, routing, packet flow, and firewall inspection.

Typical questions:

- Is the service listening?
- Is DNS resolving?
- Is the route correct?

### Docker Operations

Use [docker commands](commands/docker.md) when the issue lives inside containers or the container runtime.

Typical questions:

- Is the container running?
- What are the logs?
- Is the image or network config wrong?

### System Operations

Use [system commands](commands/system.md) for `systemd`, logs, processes, boot issues, and general host triage.

Typical questions:

- Did the service crash?
- What is the last journal output?
- Is the host under memory or CPU pressure?

## Recommended Order

For most incidents, follow this order:

1. `system` for host state and logs.
2. `network` for ports, routes, and DNS.
3. `disk` for saturation or storage issues.
4. `docker` if the workload runs in containers.
5. `file` when configuration or permissions are suspicious.

## Related Pages

- [System Architecture](../architecture/overview.md)
- [Port Policy](../architecture/port-strategy.md)
