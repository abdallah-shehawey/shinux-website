---
title: Wildcards & Globbing in Linux Deep Cli Guide
description: >-
  A deep, practical, and system-level guide to understanding wildcards
  (globbing) in the Linux Command Line Interface. This guide goes far beyond
  basic usage to explain how globbing really works, how…
order: 7
tags:
  - linux
draft: false
author: abdallah-shehawey
---
A **deep, practical, and system-level guide** to understanding **wildcards (globbing)** in the Linux Command Line Interface.
This guide goes far beyond basic usage to explain **how globbing really works, how shells differ, pitfalls, performance, and professional shell workflows**.

---

## Table of Contents

1. What Wildcards Really Are

2. Globbing vs Regular Expressions (Critical Difference)

3. Where and When Expansion Happens

4. Types of Wildcards (In Depth)

5. Brace Expansion (Pre-Globbing Phase)

6. Advanced Globbing Patterns

7. Hidden Files and Dotfiles

8. Recursive Globbing (`**`)

9. Wildcards with Common Commands

10. Wildcards vs `find`

11. Quoting, Escaping & Disabling Expansion

12. Error Handling & Safety Techniques

13. Performance Considerations

14. Shell Differences (bash, zsh, sh)

15. Real-World Use Cases

16. Common Mistakes & Debugging

17. Exercises (Beginner → Advanced)


---

## What Wildcards _really_ Are

Wildcards are **pattern-matching characters expanded by the shell itself**, **not by commands** like `ls`, `cp`, or `rm`.

Example:

```bash
ls *.txt
```

What actually happens:

```bash
shell expands *.txt → file1.txt file2.txt
ls file1.txt file2.txt
```

> ⚠ Commands never see wildcards — they only receive expanded filenames.

---

## Globbing vs Regular Expressions

|Feature|Wildcards (Globs)|Regex|
|---|---|---|
|Expanded by|Shell|Program|
|Syntax|Simple|Complex|
|Recursive|Limited|Yes|
|Context|Filenames|Text content|

Example confusion:

```bash
ls .*txt      # glob
ls | grep .*txt  # regex
```

---

## Expansion Order (very Important)

Shell expansion happens in a defined order:

1. Brace expansion `{}`

2. Tilde expansion `~`

3. Parameter expansion `$VAR`

4. Command substitution `$( )`

5. **Pathname expansion (globbing)**

6. Quote removal


This affects correctness and safety.

---

## Types of Wildcards (deep Dive)

### Asterisk `*`

- Matches **zero or more characters**

- Does NOT cross directory separators (`/`)


```text
*.log
backup*
```

---

### Question Mark `?`

- Matches **exactly one character**


```text
file?.txt   # file1.txt ✅ | file10.txt ❌
```

---

### Character Classes `[ ]`

```text
file[1-3].txt
file[a-z].txt
```

Advanced:

```text
file[!0-9].txt   # NOT digits
```

---

## Brace Expansion `{}` (not a Wildcard!)

Brace expansion generates strings **before globbing**.

```text
echo file{1,2,3}.txt
```

Output:

```text
file1.txt file2.txt file3.txt
```

Ranges:

```text
echo {a..d}
echo {01..10}
```

---

## Advanced Globbing Patterns

Enable extended globbing:

```text
shopt -s extglob
```

Patterns:

```text
*.!(txt)      # anything except txt
*@(jpg|png)
```

Requires Bash or Zsh.

---

## Hidden Files & Dotfiles

- `*` ✅ does NOT match `.hidden`

- `.*` ✅ matches dotfiles

- `.*` ⚠ also matches `.` and `..`


Safe pattern:

```bash
ls .[^.]*
```

---

## Recursive Globbing `**`

Enable:

```text
shopt -s globstar
```

Example:

```bash
ls **/*.c
```

Equivalent (conceptually):

```bash
find . -name "*.c"
```

---

## Wildcards with Common Commands

```text
cp *.txt /backup/
rm report[0-9].txt
mv *.log old_logs/
chmod +x *.sh
```

Always test first:

```text
echo rm *.log
```

---

## Wildcards vs `find`

|Use Case|Wildcards|find|
|---|---|---|
|Recursive|❌|✅|
|Size/time filters|❌|✅|
|Performance (small dirs)|✅|❌|

Best practice:

- Use globs for simple cases

- Use `find` for complex logic


---

## Quoting & Escaping

### Disable Expansion Completely:

```text
echo "*.txt"
```

### Escape a Single Wildcard:

```text
echo \*.txt
```

Why important:

```text
rm "$file"
```

---

## Safety Techniques (very Important)

### Dry Run Everything:

```text
echo rm *.log
```

### Fail on No Matches:

```text
shopt -s failglob
```

### Prevent Dangerous Deletes:

```text
rm -- -file.txt
```

---

## Performance Considerations

- Globbing happens **before execution**

- Large directories = memory expansion cost

- Use `find` for thousands of files


Shell limits:

```text
getconf ARG_MAX
```

---

## Shell Differences

|Feature|sh|bash|zsh|
|---|---|---|---|
|Brace expansion|❌|✅|✅|
|Recursive `**`|❌|✅|✅|
|Extended glob|❌|✅|✅|
|Safer defaults|❌|❌|✅|

---

## Real-world Use Cases

### Cleanup Logs:

```text
rm /var/log/*.{1,old}
```

### Project Setup:

```text
mkdir -p app/{src,bin,docs,tests}
```

### Batch Rename Preview:

```text
echo mv *.jpeg *.jpg
```

---

## Common Mistakes

❌ Believing commands interpret wildcards
❌ Forgetting hidden files
❌ Mixing regex with glob syntax
❌ Unquoted variables

---

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

---

✅ This guide is designed for **Linux users, sysadmins, DevOps engineers, and shell scripters**.

Understanding globbing gives you **precision, safety, and speed** at the command line.

Happy hacking 🐧
