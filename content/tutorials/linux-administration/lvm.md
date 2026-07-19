---
title: Logical Volume Management (lvm) Guide
description: >-
  Logical Volume Management (LVM) provides a flexible way to manage disk space.
  It allows you to create virtual partitions that can be easily resized, even
  across multiple physical drives.
order: 20
tags:
  - linux
draft: false
author: abdallah-shehawey
---
Logical Volume Management (LVM) provides a flexible way to manage disk space. It allows you to create virtual partitions that can be easily resized, even across multiple physical drives.

## Physical Volumes (pv)

Physical volumes are the raw building blocks (partitions or full disks) that LVM uses.

### Create a Physical Volume

Initialize a partition or disk for LVM use.

```text
pvcreate /dev/nvme1n1p1
```

### Display Physical Volumes

Check the status and capacity of your physical volumes.

```text
# Brief summary
pvs

# Detailed information
pvdisplay
```

## Volume Groups (vg)

A Volume Group is a pool of storage created by combining one or more Physical Volumes.

### Create a Volume Group

Combine multiple physical partitions into a single pool named `myvg`.

```text
vgcreate myvg /dev/nvme1n1p1 /dev/nvme1n1p2
```

### Display Volume Groups

```text
# Brief summary
vgs

# Detailed information
vgdisplay
```

## Logical Volumes (lv)

Logical Volumes are the "virtual partitions" created from a Volume Group. You format these with a filesystem and mount them.

### Create a Logical Volume

Create a volume named `mylvm` with a size of 2GB.

```text
# -L: size (e.g., 2G, 500M)
# -n: name of the logical volume
lvcreate -L 2G -n mylvm myvg
```

### Format the Volume

Before using the volume, create a filesystem (e.g., ext4).

```text
mkfs.ext4 /dev/myvg/mylvm
```

### Mount the Volume

Map the volume to a directory in your system.

```text
# Check block devices
lsblk

# Create mount point and mount
mkdir /data
mount /dev/myvg/mylvm /data/
```

## Extending Storage

One of the main benefits of LVM is the ability to grow storage on the fly.

### Step A: Prepare New Physical Storage

If you run out of space in the Volume Group, initialize a new partition.

```text
pvcreate /dev/nvme1n1p3
```

### Step B: Extend the Volume Group

Add the new physical volume to your existing pool.

```text
vgextend myvg /dev/nvme1n1p3
```

### Step C: Extend the Logical Volume

Increase the size of the logical volume.

```text
# Add 2GB to the current size
lvextend -L +2G /dev/myvg/mylvm
```

### Step D: Resize the Filesystem

The LV is now larger, but the filesystem (ext4) needs to be told to fill that new space.

```text
# Check for errors first
e2fsck -f /dev/myvg/mylvm

# Resize to fill the new LV capacity
resize2fs /dev/myvg/mylvm
```

## Shrinking Storage

**Warning:** Shrinking a volume is risky. Always back up your data first. You must shrink the filesystem **before** reducing the Logical Volume size.

### Step A: Unmount the Volume

You cannot safely shrink most filesystems while they are mounted.

```text
umount /data
```

### Step B: Check and Resize Filesystem

Reduce the filesystem to the target size (e.g., 2GB).

```text
e2fsck -f /dev/myvg/mylvm
resize2fs /dev/myvg/mylvm 2G
```

### Step C: Reduce the Logical Volume

Now that the filesystem is small, you can reduce the LV container.

```text
lvreduce -L 2G /dev/myvg/mylvm
```

### Step D: Re-mount and Verify

```text
mount /dev/myvg/mylvm /data/
df -h /data
```

## Summary of Useful Commands

| Level             | Create     | View  | Extend     |
| ----------------- | ---------- | ----- | ---------- |
| **Physical (PV)** | `pvcreate` | `pvs` | N/A        |
| **Group (VG)**    | `vgcreate` | `vgs` | `vgextend` |
| **Logical (LV)**  | `lvcreate` | `lvs` | `lvextend` |
