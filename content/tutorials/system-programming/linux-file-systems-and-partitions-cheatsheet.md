---
title: Linux File Systems & Partitions Cheatsheet
description: >-
  Everything from raw disk layout down to how a single file's data gets located
  on disk, as a working reference: partition tables (MBR and GPT), the Unix
  filesystem's internal structure, inodes and…
order: 1
tags:
  - systems
draft: false
author: abdallah-shehawey
---
Everything from raw disk layout down to how a single file's data gets located on disk, as a working reference: partition tables (MBR and GPT), the Unix filesystem's internal structure, inodes and their pointer system, device files, and hard vs. symbolic links.

## Mbr Partition Table Layout

The classic Master Boot Record, read with `dd`:

| Offset | Size | Description |
| --- | --- | --- |
| 0 | 446 B | Boot Code (IPL) |
| 446 | 64 B | Partition Table |
| 510 | 2 B | Signature (`0x55AA`) |

Each of the (up to four) partition table entries is 16 bytes:

| Field | Size | Description |
| --- | --- | --- |
| Active | 1 B | Bootable flag |
| Starting CHS | 3 B | Cylinder-Head-Sector address |
| Type | 1 B | Partition type |
| Ending CHS | 3 B | Cylinder-Head-Sector address |
| Start Sector | 4 B | LBA of the first sector |
| Num Sectors | 4 B | Number of sectors |

## Working with Disks and Partitions

```text
lsblk                          # simple view
sudo fdisk -l                  # detailed view
sudo fdisk -l /dev/sda         # a specific disk
sudo fdisk /dev/sda            # interactive editor for a specific disk
```

Inside the interactive `fdisk` editor, the commands that come up most:

- `n` — add a new partition, `d` — delete one, `t` — change a partition's type, `p` — print the table, `w` — write changes and exit, `q` — quit without saving
- `g` — create an empty GPT label, `o` — create an empty MBR (DOS) label
- `l` — list known partition type codes, `m` — print the full help menu

Creating a primary partition is `n → p → <start> → <end> → w`; an extended partition is `n → e → <start> → <end> → w`, after which logical partitions inside it are added with `n → l`.

Reading the raw partition table directly (the 64 B table + 2 B signature described above):

```bash
sudo dd if=/dev/sda bs=512 count=1 | tail -c 66 | hexdump -C
```

After modifying partitions, the kernel can be told to re-read the table without a reboot:

```bash
sudo partprobe            # reload the partition table
sudo kpartx -a /dev/sdX    # map partitions to device nodes
```

## Disk Usage & Uuids

```text
df -h                          # mounted disk usage, human-readable
df -i                          # inode usage
du -sh /path/to/dir            # usage of a specific directory
du -ah . | sort -rh | head -n 20   # biggest consumers in the current dir

blkid                          # UUIDs of all partitions
blkid /dev/sda1                # UUID of one device
lsblk -f                        # UUIDs + filesystem type, tree view
```

Mounting by UUID (more stable than device names like `/dev/sda1`, which can shift):

```bash
sudo mount UUID=<uuid> /mnt/point
```

Permanently, via `/etc/fstab`:

```ini
UUID=<uuid> /mnt/point ext4 defaults 0 2
```

## Gpt (guid Partition Table)

GPT replaces the MBR scheme on modern disks. Each LBA (Logical Block Address) is normally 512 bytes:

| LBA | Size | Purpose |
| --- | --- | --- |
| LBA 0 | 512 B | **Protective MBR** — a legacy MBR that marks the disk as occupied, so old MBR-only tools don't misinterpret it as blank. |
| LBA 1 | 512 B | **Primary GPT Header** — disk GUID, usable LBA range, number/size of partition entries, CRC checksums. |
| LBA 2–33 | 16 KiB | **Primary Partition Entries** — typically 128 entries × 128 bytes, each describing one partition's type GUID, unique GUID, start/end LBA, attributes, and name. |
| LBA 34…(n−34) | variable | **Partition Data Region** — the actual partitions. |
| LBA (n−33)…(n−2) | 16 KiB | **Secondary Partition Entries** — backup copy of the entries array. |
| LBA (n−1) | 512 B | **Secondary GPT Header** — backup copy of the header, at the very end of the disk. |

Because GPT keeps a full backup of both the header and the partition entries at the opposite end of the disk, a corrupted primary header is recoverable — this is the main practical advantage over MBR, beyond lifting the 4-partition and 2 TB limits.

## Unix Filesystem Structure

**Level 1 — the disk:** the MBR/GPT sits in the first sector(s), describing how the disk is divided into partitions (P1, P2, …), each of which can hold an independent filesystem.

**Level 2 — inside a partition**, once formatted:

1. **Boot Block** — the first block; holds the 2nd-stage bootloader that understands the filesystem well enough to load the kernel.
2. **Super Block** — the filesystem's "ID card": total size, free-block list, bad-block list, and other global metadata.
3. **Inode List** — one inode per file/directory, holding all of that file's metadata.
4. **Data Blocks** — the bulk of the partition; the actual file contents.

Inspect a filesystem's superblock-level details with:

```bash
sudo tune2fs -l <partition_name>
```

## Inodes and the Pointer System

An inode holds everything about a file **except its name and its actual data**: mode (type + permissions), owner (UID/GID), size, and timestamps (`atime`/`mtime`/`ctime`) — plus a pointer system that locates the file's data blocks. Opening a file means: look up its name in a directory to get an inode number, read that inode for metadata and permission checks, then follow its pointers to the data.

Assuming a 4 KB block size and 4-byte pointers, the pointer tiers scale like this:

| Pointer Type | Pointers in Inode | Data Addressed | Cumulative Max File Size |
| --- | --- | --- | --- |
| Direct | 12 | 12 × 4 KB | 48 KB |
| Single Indirect | 1 | 1024 × 4 KB | ~4.04 MB |
| Double Indirect | 1 | 1024 × 1024 × 4 KB | ~4.004 GB |
| Triple Indirect | 1 | 1024³ × 4 KB | ~4.004 TB |

The 12 direct pointers handle small files with no extra lookup; once a file outgrows them, the single indirect pointer adds a whole block's worth of *more pointers* rather than data, and the double/triple indirect tiers repeat that trick one and two levels deeper — trading one extra disk read per tier for several orders of magnitude more addressable space.

## Devices, Character vs. Block

Hardware shows up in `/dev` as one of two kinds of special file:

- **Character devices** — serial, byte-at-a-time, unbuffered (keyboards, mice, serial ports, `/dev/tty`).
- **Block devices** — fixed-size chunks, buffered, randomly addressable (HDDs, SSDs, USB drives, optical drives).

```bash
ls -l /dev            # first letter: 'c' = character, 'b' = block
less /proc/devices
lsblk                  # block devices specifically, tree view
```

## Mounting

```text
findmnt                # cleaner, tree-like view of everything currently mounted
man 8 mount             # the command-line utility
man 2 mount             # the underlying system call
```

## File Metadata: `stat` and `touch`

```text
stat <filename>    # inode number, link count, atime/mtime/ctime, size, permissions
man 2 stat
touch newfile.txt   # create if missing, or bump atime/mtime if it exists
man 7 inode          # inode structure and file-type reference
```

The first character of `ls -l`'s permission string encodes the file type: `-` regular file, `d` directory, `l` symlink, `b` block device, `c` character device.

## Hard Links vs. Symbolic Links

**Hard links** (`ln target link_name`) point to the exact same inode as the original — no distinction between "original" and "link" at all. They can't cross filesystems (an inode number is only unique within its own filesystem), can't target a directory (to avoid loops), and the data is only actually freed once the inode's link count drops to zero — so deleting the "original" name doesn't touch the data as long as another hard link still references it. This is exactly how tools like `rsnapshot` do space-efficient incremental backups: unchanged files across snapshots are hard-linked, not copied.

**Symbolic links** (`ln -s target_path symlink_name`) are a separate file with their own inode that just stores a text path. They can point anywhere, including across filesystems and at directories, but go "dangling" if the target is ever moved or deleted.

```text
readlink linkfile     # show what a symlink points to
man ln || man link
```
