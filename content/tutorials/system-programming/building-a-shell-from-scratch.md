---
title: Building a Shell From Scratch
description: >-
  A shell is just a loop: read a line, figure out what it means, run it, repeat.
  The interesting part is everything "run it" hides — process creation, the exec
  family, PATH searching, environment…
order: 8
tags:
  - systems
draft: false
author: abdallah-shehawey
---
A shell is just a loop: read a line, figure out what it means, run it, repeat. The interesting part is everything "run it" hides — process creation, the exec family, `PATH` searching, environment variables, I/O redirection. Building one in stages, each adding exactly one of those pieces, makes each concept land on its own instead of all at once.

## 1. `executer.c` — exec in isolation, no fork at all

Before touching shells, it's worth seeing `execve()` completely on its own:

```c
int main(int argc, char *argv[])
{
  if (argc < 2) { printf("Usage: %s path-to-elf\n", argv[0]); exit(-1); }

  char *newargv[] = {argv[1], NULL};
  char *newenvp[] = {NULL};
  execve(argv[1], newargv, newenvp);
  printf("exec failed");   // only reached if execve() itself failed
  return -2;
}
```

Run as `./executer /usr/bin/ls`, this program **replaces itself** with `ls` — same PID, brand new code and memory image. There's no `fork()`, so there's no "after exec" for the original program; if `execve()` succeeds, the line after it never runs at all. That's the core distinction to hold onto: `fork()` duplicates a process, `exec*()` replaces one. A real shell needs both — fork to keep the shell itself alive, exec to actually run the command.

## 2. `femtoshell.c` — a loop with no fork at all

The absolute minimum shell doesn't run external programs at all — just two builtins, string-matched directly:

```c
if (strcmp(line, "exit") == 0) { printf("Good Bye\n"); return 0; }

if (strncmp(line, "echo", 4) == 0 && (line[4] == ' ' || line[4] == '\0')) {
  printf("%s\n", line[4] == ' ' ? line + 5 : "");
  continue;
}

printf("Invalid command\n");   // anything else is simply rejected
```

No `fork`, no `exec` — this is as far as a shell can get by only interpreting its own input.

## 3. `simple_shell.c` — fork, execve, and wait, the whole loop closed

Add the fork/exec pair, plus actually waiting for the child and reading its exit status:

```c
pid_t pid = fork();

if (pid > 0) {
  int status;
  wait(&status);
  printf("PARENT: my pid = %d, My child status = %d\n", getpid(), WEXITSTATUS(status));
} else if (pid == 0) {
  char *newargv[] = {buf, NULL};
  char *newenvp[] = {NULL};
  execve(buf, newargv, newenvp);
  printf("exec failed\n");
  exit(-1);
}
```

This is functional, but `execve()` needs a **full path** — typing `ls` fails; only `/usr/bin/ls` works, because `execve()` never searches `PATH`. Note also `wait()` is called unconditionally right after forking, blocking the shell until that one child finishes — a real shell mostly does the same for foreground jobs, and this is also exactly what avoids turning the child into a zombie.

## 4. `Pico_Shell.c` — PATH search, real builtins, robust status handling

Swapping `execve()` for `execvp()` fixes the full-path requirement — `execvp` searches `PATH` for the command name:

```c
pid_t pid = fork();
if (pid == 0) {
  execvp(cmd_argv[0], cmd_argv);
  fprintf(stderr, "%s: command not found\n", cmd_argv[0]);
  exit(127);                       // 127 is the shell convention for "not found"
} else if (pid > 0) {
  int status;
  waitpid(pid, &status, 0);
  last_status = WIFEXITED(status) ? WEXITSTATUS(status) : 1;
}
```

`Pico_Shell` also promotes `cd`, `pwd`, and `echo` to real builtins handled *without* forking at all — `cd` in particular **has to** be a builtin, since `chdir()` only changes the calling process's own working directory; running it in a forked child would change that child's directory and then throw the change away the instant the child exits. `WIFEXITED`/`WEXITSTATUS` replace the earlier shell's blind `WEXITSTATUS` call, which would report garbage if the child had instead been killed by a signal.

## 5. `Nano_shell.c` — shell variables and `export`

Adds `NAME=value` assignment parsing and `$NAME` expansion inside arguments:

```c
char *eq = strchr(line, '=');
// ...detect "name=value" with no spaces around '=', store it in a vars[] table

// later, per-token:
char *expanded = expand_variable(token, vars, var_count);   // walks the token,
                                                              // replacing $NAME with vars[i].value
```

Variables set this way are **shell-local** by default — invisible to child processes — until `export` is used. `export` flips a variable's `exported` flag, and only then does the fork branch build a `new_envp` array (starting from the inherited `environ`, then appending/overwriting the exported names) and hand it to `execvp`'s underlying `execve()` via `environ = new_envp;`. This is the same mechanism real shells use to decide what a child process can see of the parent shell's variables.

## 6. `micro_shell.c` — I/O redirection

The final layer adds `<`, `>`, and `2>`, implemented with `dup2()`:

```c
int fd = open(res, O_WRONLY | O_CREAT | O_TRUNC, 0644);
dup2(fd, STDOUT_FILENO);   // fd 1 now points at the opened file instead of the terminal
close(fd);                  // the original fd can be closed — dup2 already aliased it onto fd 1
```

Crucially, redirection for an **external command** happens *after* `fork()`, inside the child only — `apply_redirections(tokens, token_count, 0)` runs right before `execvp()`, so only that one child's stdout/stdin/stderr get rerouted, never the shell's own. For a **builtin** (`echo > file`, say), there's no child process to isolate the change in — `micro_shell` works around this by saving copies of the shell's own fd 0/1/2 with `dup()` first, running the builtin against the redirected fds, then `dup2`-ing the saved copies back over fd 0/1/2 afterward to restore the shell's normal I/O.

## From end to end

Six programs, six concepts, each one addressing exactly what broke in the previous version: `execve` replaces a process → `fork` keeps the shell alive across that replacement → `wait`/`waitpid` collects the result instead of leaking a zombie → `execvp` removes the full-path requirement → builtins handle the things a child process fundamentally can't (`cd`, `export`) → `dup2`-based redirection reroutes I/O without ever touching the shell's own descriptors. That's most of what a real shell does before getting into pipelines and job control.
