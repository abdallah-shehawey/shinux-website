---
title: A Practical Git & GitHub Workflow
description: >-
  Clone, branch, commit, push, and open a pull request — the day-to-day Git
  workflow in one guide.
date: 2026-05-03T00:00:00.000Z
tags:
  - git
  - github
  - workflow
locale: en
draft: false
author: abdallah-shehawey
---

This guide walks you through the complete workflow for pulling a repository, making changes, and pushing them back up to GitHub.

### Step 1: Clone the repository

First, get a local copy of the repository on your computer.

```bash
git clone https://github.com/username/repository-name.git
```

Then, move into the newly created folder:

```bash
cd repository-name
```

### Step 2: Create a new branch

It's highly recommended to work on a separate branch instead of editing the `main` branch directly. This keeps your changes organized and safe.

```bash
git checkout -b your-branch-name
```

_Example:_

```bash
git checkout -b new-branch
```

### Step 3: Make your edits

Now you can open the project in your favorite code editor and start making changes.

```bash
nvim .
```

Go ahead and edit files, add new ones, or delete old ones.

### Step 4: Stage and commit your changes

Once you're happy with your edits, you need to "stage" them (prepare them for saving) and then "commit" them (save them with a message).

**1. Stage all changes:**

```bash
git add .
```

**2. Commit the staged changes with a clear message:**

```bash
git commit -m "Describe what you changed"
```

### Step 5: Push your branch to GitHub

Now, send your new branch (with your commits) up to the remote repository on GitHub.

```bash
git push origin new-branch
```

### Step 6: Create a pull request (PR)

This is the standard way to merge your changes into the `main` branch.

1. Go to the repository page on GitHub.
2. You will see a notification with your new branch name and a button that says **"Compare & pull request"**.
3. Click it, review your changes, add a title and description, and submit the pull request.
4. Once approved (by you or a teammate), you can merge it.

> **Alternative (not recommended for teams):** If you have direct write access and are sure, you _could_ push directly to `main`, but using branches and pull requests is much safer and better practice.

### Step 7: Keep your repo in sync

If other people are working on the same repository, their changes might get merged into `main`. Before you start new work, always pull the latest changes to avoid conflicts.

**First, switch back to your main branch:**

```bash
git checkout main
```

**Then, pull the latest updates:**

```bash
git pull origin main
```
