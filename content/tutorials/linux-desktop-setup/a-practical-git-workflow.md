---
title: A Practical Git Workflow
description: >-
  This walks through the complete day-to-day loop for contributing to a
  repository: cloning it, working on a branch, committing, pushing, opening a
  pull request, and staying in sync with everyone…
order: 4
tags:
  - linux
draft: false
author: abdallah-shehawey
---
This walks through the complete day-to-day loop for contributing to a repository: cloning it, working on a branch, committing, pushing, opening a pull request, and staying in sync with everyone else's changes. It's the same handful of commands used for nearly every change, so it's worth having down as muscle memory rather than looking it up each time.

## 1. Clone the repository

```bash
git clone https://github.com/username/repository-name.git
cd repository-name
```

## 2. Create a new branch

Work on a separate branch instead of editing `main` directly — it keeps changes organized and means `main` is never in a half-finished state.

```bash
git checkout -b your-branch-name
```

```bash
git checkout -b new-branch   # example
```

## 3. Make your edits

Open the project in an editor and make the changes:

```bash
nvim .
```

## 4. Stage and commit

Stage everything that changed:

```bash
git add .
```

Commit with a message that says why, not just what:

```bash
git commit -m "Describe what you changed"
```

## 5. Push the branch

```bash
git push origin new-branch
```

## 6. Open a pull request

1. Go to the repository page on GitHub.
2. GitHub shows a banner for the branch just pushed, with a **Compare & pull request** button.
3. Click it, review the diff, add a title and description, and submit.
4. Once approved, merge it.

> **Alternative (not recommended for teams):** with direct write access it's possible to push straight to `main`, but branches + pull requests catch mistakes before they land and give reviewers something concrete to comment on.

## 7. Keep the local repo in sync

Once other people's work lands on `main`, pull it before starting anything new to avoid unnecessary conflicts:

```bash
git checkout main
git pull origin main
```
