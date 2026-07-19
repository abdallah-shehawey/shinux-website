---
title: Reimplementing Unix Utilities in C
description: >-
  The best way to actually understand a syscall is to reimplement the tool
  that's built on it. These small clones of cat, cp, echo, mv, pwd, and fdisk
  each isolate one or two POSIX calls — read/write,…
order: 9
tags:
  - systems
draft: false
author: abdallah-shehawey
---
The best way to actually understand a syscall is to reimplement the tool that's built on it. These small clones of `cat`, `cp`, `echo`, `mv`, `pwd`, and `fdisk` each isolate one or two POSIX calls — `read`/`write`, `open`, `rename`, `getcwd`, raw disk I/O — stripped of every convenience flag the real coreutils version supports.

## 1. `mycat` — read() and write() in a loop

```c
#define count 100
int fd = open(argv[1], O_RDONLY);

char buf[count];
int numread;
while ((numread = read(fd, buf, count)) > 0) {
  if (write(1, buf, numread) < 0) { printf("write failed\n"); exit(-3); }
}
close(fd);
```

`cat` is nothing more than this loop: `read()` returns however many bytes it actually managed to read (which can be less than the buffer size — never assume a full read), and `0` signals EOF. Writing to fd `1` is stdout — `cat` doesn't know or care whether that's a terminal or a redirected file, which is exactly the point of the fd abstraction.

## 2. `mycp` — the same loop, with a second fd for the destination

```c
int fd_1 = open(argv[1], O_RDONLY);
int fd_2 = open(argv[2], O_RDWR | O_CREAT, 0644);

while ((numread = read(fd_1, buff, COUNT)) > 0) {
  if (write(fd_2, buff, numread) < 0) { printf("write failed\n"); exit(-3); }
}
```

`O_CREAT` with mode `0644` creates the destination if it doesn't exist, readable/writable by the owner and read-only for everyone else. Structurally this is `mycat` with one extra fd — copying a file really is just reading one fd and writing another.

## 3. `myecho` — argv, nothing else

```c
for (int i = 1; i < argc; i++) {
  printf("%s", argv[i]);
  if (i < argc - 1) printf(" ");
}
printf("\n");
```

No syscalls at all — `echo` is purely a demonstration of how the shell has already split the command line into `argv` before the program ever sees it. The space-joining logic is the only real "logic" in the whole program.

## 4. `mymv` — one syscall, `rename()`

```c
if (rename(argv[1], argv[2]) != 0) {
  fprintf(stderr, "mv: cannot move '%s' to '%s': %s\n", argv[1], argv[2], strerror(errno));
  exit(-2);
}
```

`rename()` does the move atomically at the filesystem level — no read/write loop needed at all, as long as source and destination are on the **same filesystem** (across filesystems, real `mv` silently falls back to a copy-then-delete, since a raw rename can't span them).

## 5. `mypwd` — getcwd() and nothing more

```c
char buffer[PATH_MAX];
if (getcwd(buffer, sizeof(buffer)) == NULL) {
  fprintf(stderr, "pwd: %s\n", strerror(errno));
  exit(EXIT_FAILURE);
}
printf("%s\n", buffer);
```

`PATH_MAX` (from `<limits.h>`) sizes the buffer to whatever the largest path the OS allows actually is — not a guessed constant.

## 6. `myfdisk` — reading a raw MBR partition table

This one skips the filesystem layer entirely and reads a block device directly, parsing the same 512-byte MBR structure covered in the filesystem cheatsheet lesson:

```c
typedef struct {
  uint8_t  status;          // 0x80 = bootable
  uint8_t  first_chs[3];
  uint8_t  partition_type;
  uint8_t  last_chs[3];
  uint32_t lba;              // starting LBA
  uint32_t sector_count;
} PartitionEntry;
```

The four primary entries live at a fixed offset in the first sector:

```c
char buf[512];
read(fd, buf, 512);
PartitionEntry *table_entry_ptr = (PartitionEntry *)&buf[446];   // 446 = boot code size

for (int i = 0; i < 4; i++) {
  PartitionEntry *ptr = &table_entry_ptr[i];
  if (ptr->partition_type == 0 || ptr->sector_count == 0) continue;
  print_partition(devname, part_index, ptr);
}
```

Casting `&buf[446]` straight to a `PartitionEntry*` works because the struct's field order and sizes exactly match the on-disk layout, byte for byte — this only holds because there's no padding surprise between `uint8_t`s and the `uint32_t`s here on a typical x86 layout. An extended partition (`type 0x05`/`0x0F`) is a linked list rather than a fixed slot: each Extended Boot Record (EBR) contains one real partition entry plus a pointer to the *next* EBR, which `read_ebr()` walks with `lseek()` to each new sector in turn until it hits an entry with no further link. `myfdisk` also sizes each partition in human-readable units and looks up a human-readable type name for the raw type byte (`0x83` → "Linux", `0x82` → "Linux swap", `0x0c` → "W95 FAT32 (LBA)", …) — the same partition-type table `fdisk -l` uses internally.

## 7. `myarg` — what the shell hands a program

```c
printf("argc = %d\n", argc);
for (i = 0; i < argc; i++) {
  printf("argv[%d] = %s\n", i, argv[i]);
}
```

Run with a mix of quoted arguments, globs, and variables, this makes concrete exactly what survives shell parsing before a program ever sees it: quotes are stripped but their *grouping* is preserved as one `argv` slot, wildcards are already expanded into separate slots, and `argv[0]` is always the program's own invocation name — not guaranteed to be a full path, and not necessarily even the real executable name if it was invoked through a symlink.
