---
title: 'Wildcards & Globbing in Linux: A Deep CLI Guide'
description: >-
  How shell globbing actually works, where it differs from regex, and the safety
  habits that prevent painful mistakes.
date: 2026-06-17T00:00:00.000Z
tags:
  - terminal
  - bash
  - cli
locale: en
draft: false
author: abdallah-shehawey
---

A practical, system-level guide to understanding **wildcards (globbing)** in the Linux command line — how globbing really works, how shells differ, and the pitfalls worth knowing.

## What wildcards really are

Wildcards are **pattern-matching characters expanded by the shell itself**, not by commands like `ls`, `cp`, or `rm`.

```bash
ls *.txt
```

What actually happens:

```text
shell expands *.txt → file1.txt file2.txt
ls file1.txt file2.txt
```

Commands never see wildcards — they only receive expanded filenames.

## Globbing vs. regular expressions

| Feature    | Wildcards (Globs) | Regex   |
| ----------- | ------------------ | ------- |
| Expanded by | Shell              | Program |
| Syntax      | Simple             | Complex |
| Recursive   | Limited            | Yes     |
| Context     | Filenames          | Text content |

Example confusion:

```bash
ls .*txt        # glob
ls | grep .*txt # regex
```

## Expansion order (important)

Shell expansion happens in a defined order: brace expansion `{}` → tilde expansion `~` → parameter expansion `$VAR` → command substitution `$( )` → pathname expansion (globbing) → quote removal. This affects correctness and safety.

## Types of wildcards

### Asterisk `*`

Matches zero or more characters, and does **not** cross directory separators (`/`).

```bash
*.log
backup*
```

### Question mark `?`

Matches exactly one character.

```bash
file?.txt   # file1.txt matches | file10.txt does not
```

### Character classes `[ ]`

```bash
file[1-3].txt
file[a-z].txt
file[!0-9].txt   # NOT digits
```

## Brace expansion `{}` (not a wildcard!)

Brace expansion generates strings **before** globbing.

```bash
echo file{1,2,3}.txt
```

```text
file1.txt file2.txt file3.txt
```

Ranges:

```bash
echo {a..d}
echo {01..10}
```

## Advanced globbing patterns

Enable extended globbing:

```bash
shopt -s extglob
```

```bash
*.!(txt)      # anything except txt
*@(jpg|png)
```

Requires Bash or Zsh.

## Hidden files and dotfiles

`*` does NOT match `.hidden`. `.*` matches dotfiles, but also `.` and `..`.

Safe pattern:

```bash
ls .[^.]*
```

## Recursive globbing `**`

```bash
shopt -s globstar
ls **/*.c
```

Conceptually equivalent to:

```bash
find . -name "*.c"
```

## Wildcards with common commands

```bash
cp *.txt /backup/
rm report[0-9].txt
mv *.log old_logs/
chmod +x *.sh
```

Always test first:

```bash
echo rm *.log
```

## Wildcards vs. `find`

| Use Case                | Wildcards | find |
| ------------------------ | --------- | ---- |
| Recursive                | No        | Yes  |
| Size / time filters      | No        | Yes  |
| Performance (small dirs) | Yes       | No   |

Use globs for simple cases, `find` for complex logic.

## Quoting & escaping

Disable expansion completely:

```bash
echo "*.txt"
```

Escape a single wildcard:

```bash
echo \*.txt
```

Why it matters:

```bash
rm "$file"
```

## Safety techniques (very important)

Dry-run everything:

```bash
echo rm *.log
```

Fail on no matches:

```bash
shopt -s failglob
```

Prevent dangerous deletes:

```bash
rm -- -file.txt
```

## Performance considerations

Globbing happens before execution; large directories mean memory expansion cost. Use `find` for thousands of files.

```bash
getconf ARG_MAX
```

## Shell differences

| Feature          | sh  | bash | zsh |
| ----------------- | --- | ---- | --- |
| Brace expansion   | No  | Yes  | Yes |
| Recursive `**`    | No  | Yes  | Yes |
| Extended glob     | No  | Yes  | Yes |
| Safer defaults    | No  | No   | Yes |

## Real-world use cases

```bash
# Cleanup logs
rm /var/log/*.{1,old}

# Project setup
mkdir -p app/{src,bin,docs,tests}

# Batch rename preview
echo mv *.jpeg *.jpg
```

## Common mistakes

Believing commands interpret wildcards, forgetting hidden files, mixing regex with glob syntax, and unquoted variables.

## Exercises

Beginner:

```bash
ls *.txt
```

Intermediate:

```bash
find . -name "*.log" -mtime -3
```

Advanced:

```bash
shopt -s globstar extglob
ls **/*.!(*.tmp)
```

Understanding globbing gives you precision, safety, and speed at the command line.
