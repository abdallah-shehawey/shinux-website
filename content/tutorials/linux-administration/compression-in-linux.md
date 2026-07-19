---
title: Archiving and Compression in Linux
description: >-
  In Linux, compression is conceptually similar to creating a .zip file in
  Windows. However, Linux separates the ideas of archiving and compression,
  giving you more flexibility.
order: 900
tags:
  - linux
draft: false
author: abdallah-shehawey
---
In Linux, **compression** is conceptually similar to creating a `.zip` file in Windows. However, Linux separates the ideas of **archiving** and **compression**, giving you more flexibility.

- **Archiving**: Bundling multiple files/directories into a single file.

- **Compression**: Reducing the size of that file using algorithms such as gzip, bzip2, or xz.


The most common tool for archiving in Linux is **`tar`**, which stands for **Tape ARchive**.

## Creating an Archive _without_ Compression

This creates a `.tar` file that only bundles files/directories together, without reducing their size.

```text
tar -cvf file.tar target_file_or_dir
```

### Options Explained:

- `-c` → **Create** a new archive

- `-v` → **Verbose** output (shows files being archived)

- `-f` → **File** name of the archive


### Example:

```text
tar -cvf project.tar project/
```

### Extracting an Uncompressed Archive:

```text
tar -xvf file.tar -C output_dir
```

- `-x` → **Extract** files

- `-C` → Directory where files will be extracted


## Creating an Archive _with_ Compression

Linux allows you to choose the compression algorithm while creating the archive.

### 2.1 Using Gzip Compression (`.tar.gz` or `.tgz`)

Fastest speed, standard compression.

```text
tar -czvf file.tar.gz target_file_or_dir
```

- `-z` → Compress using **gzip**


### 2.2 Using Bzip2 Compression (`.tar.bz2`)

Better compression than gzip, but slower.

```text
tar -cjvf file.tar.bz2 target_file_or_dir
```

- `-j` → Compress using **bzip2**


### 2.3 Using Xz Compression (`.tar.xz`)

**Best compression**, but much slower to create.

```text
tar -cJvf file.tar.xz target_file_or_dir
```

- `-J` → Compress using **xz** (Capital J)


## Listing Archive Contents (without Extracting)

To view what is inside an archive without unpacking it, use the `-t` flag.

```text
tar -tvf file.tar
```

- `-t` → **List** the contents

- `-v` → **Verbose** (shows details like file size and permissions)


This works for compressed archives as well:

```text
tar -tvf file.tar.gz
tar -tvf file.tar.bz2
tar -tvf file.tar.xz
```

## Extracting Compressed Archives

### Extract Gzip-compressed Archive:

```text
tar -xzvf file.tar.gz -C output_dir
```

### Extract Bzip2-compressed Archive:

```text
tar -xjvf file.tar.bz2 -C output_dir
```

### Extract Xz-compressed Archive:

```text
tar -xJvf file.tar.xz -C output_dir
```

> ✅ **Note:** Modern versions of `tar` can usually detect the compression type automatically without needing `-z`, `-j`, or `-J`, so `tar -xvf file.tar.xz` often works fine.

## Comparison: Gzip vs. Bzip2 vs. Xz

Here is a detailed comparison of the three most popular formats.

|Feature|**gzip** (`.gz`)|**bzip2** (`.bz2`)|**xz** (`.xz`)|
|---|---|---|---|
|**Algorithm**|DEFLATE|Burrows–Wheeler|LZMA2|
|**Compression Ratio**|Low (Largest file size)|Medium|**High (Smallest file size)**|
|**Compression Speed**|**Fast**|Moderate|Very Slow|
|**Decompression Speed**|**Fast**|Slow|Moderate|
|**Memory Usage**|Low|Medium|High|
|**Usage Scenario**|Speed is priority|Balance between size/speed|Max compression needed|
|**Tar Flag**|`-z`|`-j`|`-J`|

### 5.1 Gzip

- **Algorithm:** Uses the DEFLATE algorithm.

- **Pros:** Fast compression and decompression; low CPU/memory usage.

- **Cons:** Lower compression ratio compared to the others.

- **Best For:** Log rotation, frequent backups where speed matters, and systems with limited resources.


### 5.2 Bzip2

- **Algorithm:** Uses the Burrows–Wheeler Transform (BWT) and Huffman coding.

- **Pros:** Produces smaller files than gzip.

- **Cons:** Slower than gzip; requires more CPU. Decompression is faster than compression but still slower than gzip.

- **Best For:** Source code archives or when you need a balance between file size and time.


### 5.3 Xz

- **Algorithm:** Uses the LZMA2 algorithm.

- **Pros:** Achieves the **best compression ratio**.

- **Cons:** Extremely slow compression speed; requires significant memory.

- **Best For:** Distributing software (e.g., Linux kernel, Fedora packages), archiving for long-term storage, or saving bandwidth.


## Using Compression Commands Directly

Unlike `tar`, these tools work on single files.

### Compress a File:

```text
gzip file    # Creates file.gz
bzip2 file   # Creates file.bz2
xz file      # Creates file.xz
```

⚠ These commands **delete the original file** by default.

### Keep the Original File (`-k` Option):

```text
gzip -k file
bzip2 -k file
xz -k file
```

### Decompress a File:

You can use the `-d` flag or the dedicated commands:

```text
# Using -d flag
gzip -d file.gz
bzip2 -d file.bz2
xz -d file.xz

# Using dedicated commands
gunzip file.gz
bunzip2 file.bz2
unxz file.xz
```

## Summary Table

|Task|Command|
|---|---|
|Create archive (no compression)|`tar -cvf file.tar dir/`|
|**List archive contents**|`tar -tvf file.tar`|
|Extract archive|`tar -xvf file.tar`|
|**gzip** (Fast)|`tar -czvf file.tar.gz dir/`|
|**bzip2** (Balanced)|`tar -cjvf file.tar.bz2 dir/`|
|**xz** (Best Size)|`tar -cJvf file.tar.xz dir/`|
|Compress single file|`gzip file` / `xz file`|
|Decompress single file|`gunzip file.gz` / `unxz file.xz`|
