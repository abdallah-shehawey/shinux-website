---
title: 'Docker: Cmd vs. Entrypoint - the Comprehensive Guide'
description: >-
  This guide explains specifically how to define startup commands in Docker, the
  subtle differences between CMD and ENTRYPOINT, and when to use which.
order: 4
tags:
  - devops
draft: false
author: abdallah-shehawey
---
This guide explains specifically how to define startup commands in Docker, the subtle differences between `CMD` and `ENTRYPOINT`, and when to use which.

## The Basics: What Happens When a Container Starts?

When a container starts, it **must** have a process to run. If that process stops, the container dies. You define this startup process in the `Dockerfile` using either `CMD` or `ENTRYPOINT`.

## `cmd` (command)

### What is It?

- It defines the **default** command and arguments that the container should run.

- It is considered a "suggestion". The user can easily ignore it.

### How to Write It?

**Format (Exec form - Recommended):**

```dockerfile
CMD ["command", "param1", "param2"]
```

### Example Scenario

**Dockerfile:**

```dockerfile
FROM ubuntu
CMD ["sleep", "5"]
```

**What happens at runtime?**

|Command you run|What Docker executes|Explanation|
|---|---|---|
|`docker run my-image`|`sleep 5`|Runs the default defined in CMD.|
|`docker run my-image 10`|❌ **Error**|"10" is not a command. It tries to run an executable named "10".|
|`docker run my-image sleep 10`|`sleep 10`|**OVERRIDES** the entire CMD. The `sleep 5` is completely ignored.|

### Summary for Cmd

> **Rule:** If the user types _anything_ after the image name in `docker run`, the `CMD` instruction is **completely replaced**.

## `entrypoint`

### What is It?

- It defines the **main executable** of the container.

- It configures the container to run as a specific application.

- It is "strict". It is difficult to ignore.

### How to Write It?

**Format:**

```dockerfile
ENTRYPOINT ["command"]
```

### Example Scenario

**Dockerfile:**

```dockerfile
FROM ubuntu
ENTRYPOINT ["sleep"]
```

**What happens at runtime?**

|Command you run|What Docker executes|Explanation|
|---|---|---|
|`docker run my-image`|❌ **Error**|Runs `sleep` with no argument. (Sleep needs a number).|
|`docker run my-image 10`|`sleep 10`|**APPENDS** "10" to the entrypoint.|
|`docker run my-image 20`|`sleep 20`|**APPENDS** "20" to the entrypoint.|

### Summary for Entrypoint

> **Rule:** If the user types arguments after the image name, they are **appended** (added to the end) of the `ENTRYPOINT` command.

## The "combo" Pattern (best Practice)

Professional DevOps engineers often use **both** together.

- **ENTRYPOINT:** Defines the _executable_ (The thing that doesn't change).

- **CMD:** Defines the _default arguments_ (The thing that might change).

### Example Scenario (the Perfect Dockerfile)

**Dockerfile:**

```dockerfile
FROM ubuntu
ENTRYPOINT ["sleep"]
CMD ["5"]
```

**How Docker combines them:** Docker concatenates them: `ENTRYPOINT` + `CMD` -> `sleep 5`.

**What happens at runtime?**

|Command you run|Resulting Command|Logic|
|---|---|---|
|`docker run my-image`|`sleep 5`|Uses Entrypoint (`sleep`) + Default CMD (`5`).|
|`docker run my-image 10`|`sleep 10`|Uses Entrypoint (`sleep`) + User Argument (`10`). The CMD is overridden.|

### Why is This the Best?

1. The container feels like a binary command (`my-image 10`).

2. It still has a sensible default if the user is lazy (`my-image`).

## Technical Deep Dive: Shell vs. Exec Form

You will see two ways of writing these commands. It is crucial to use the correct one.

### Shell Form (avoid This)

```dockerfile
CMD sleep 5
```

- **What Docker actually runs:** `/bin/sh -c "sleep 5"`

- **Problem:** The main process (PID 1) becomes the _shell_, not your app.

- **Consequence:** If you try to stop the container (`Ctrl+C` or `docker stop`), the signal goes to the shell, which might not pass it to your app. Your app won't shut down gracefully.

### Exec Form (always Use This)

```dockerfile
CMD ["sleep", "5"]
```

- **What Docker actually runs:** `sleep 5`

- **Benefit:** Your app is PID 1. It receives signals correctly.

- **Syntax Rule:** You **MUST** use double quotes `"` (JSON format). Single quotes `'` will cause errors.

## How to Override Entrypoint?

We said `ENTRYPOINT` is "strict", but can we force override it? Yes, but it requires a special flag.

**Scenario:** Your ENTRYPOINT is `["sleep"]`, but you want to run a shell (`bash`) inside the container for debugging.

**Command:**

```text
docker run --entrypoint bash my-image
```

- **Argument:** `--entrypoint`

- **Behavior:** It completely deletes the `ENTRYPOINT` instruction from the Dockerfile for this specific run and replaces it with `bash`.

## Summary Cheat Sheet

| Feature               | `CMD`                              | `ENTRYPOINT`                         |
| --------------------- | ---------------------------------- | ------------------------------------ |
| **Purpose**           | Default command/args               | Main executable                      |
| **User arguments**    | **Override** existing CMD          | **Append** to ENTRYPOINT             |
| **Can correspond to** | `args` (in Kubernetes)             | `command` (in Kubernetes)            |
| **Common Use Case**   | Web servers, scripts with defaults | Tools, binaries, single-purpose apps |
| **Override Flag**     | (Just type the command)            | `--entrypoint`                       |
