---
title: Custom Zsh Configuration & Productivity Aliases (.zshrc)
description: >-
  Custom Zsh configuration file featuring eza/ls aliases, bat, fzf, fastfetch, starship prompt, and custom helper functions.
order: 7
tags:
  - zsh
  - bash
  - scripts
  - dotfiles
draft: false
author: abdallah-shehawey
---

A productivity-focused `.zshrc` configuration featuring `eza` for enhanced directory listings, `bat` for syntax-highlighted `cat`, `fzf` for fuzzy history/file searches, `starship` prompt integration, and custom CLI aliases.

## Configuration Source (`.zshrc`)

```zsh
# Path to oh-my-zsh installation
export ZSH="$HOME/.oh-my-zsh"

ZSH_THEME="robbyrussell"

plugins=(
  git
  zsh-autosuggestions
  zsh-syntax-highlighting
  sudo
)

source $ZSH/oh-my-zsh.sh

# --- Aliases ---
alias ls='eza --icons'
alias ll='eza -l --icons --git'
alias la='eza -la --icons --git'
alias cat='bat --style=plain'
alias update='update-every-thing'

# --- Custom functions ---
mcd() {
  mkdir -p "$1" && cd "$1"
}

# --- Starship prompt ---
eval "$(starship init zsh)"
```

## Highlights

- **`eza`**: Replacement for `ls` with file-type icons, git status flags, and human-readable sizes.
- **`bat`**: Replacement for `cat` with line numbers and syntax highlighting.
- **`zsh-autosuggestions` & `zsh-syntax-highlighting`**: Autocompletes commands based on terminal history.
- **`starship`**: Cross-shell prompt showing Git branch, language versions, and status indicators.
