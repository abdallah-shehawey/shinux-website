---
title: "Vim Cheat Sheet"
description: "The Vim commands worth memorizing: movement, editing, registers, macros, search & replace, and windows."
date: 2026-07-08
tags: [vim, editor, cli]
locale: en
draft: false
---

## Global

| Command             | Description                        |
| -------------------- | ------------------------------------ |
| `:h[elp] keyword`   | Open help for keyword               |
| `:sav[eas] file`    | Save file as                        |
| `:clo[se]`          | Close current pane                  |
| `:ter[minal]`       | Open a terminal window              |
| `K`                 | Open man page for word under cursor |

> Run `vimtutor` in a terminal to learn the first Vim commands.

## Cursor movement

### Basic movement

| Command | Description                        |
| -------- | ------------------------------------ |
| `h`     | Move cursor left                    |
| `j`     | Move cursor down                    |
| `k`     | Move cursor up                      |
| `l`     | Move cursor right                   |
| `gj`    | Move down (multi-line text)         |
| `gk`    | Move up (multi-line text)           |

### Screen positioning

| Command   | Description                                  |
| ---------- | ----------------------------------------------- |
| `H`       | Move to top of screen                        |
| `M`       | Move to middle of screen                     |
| `L`       | Move to bottom of screen                     |
| `zz`      | Center cursor on screen                      |
| `zt`      | Position cursor on top of screen             |
| `zb`      | Position cursor on bottom of screen          |
| `Ctrl+e`  | Scroll down one line (cursor stays)          |
| `Ctrl+y`  | Scroll up one line (cursor stays)            |
| `Ctrl+b`  | Move screen up one page                      |
| `Ctrl+f`  | Move screen down one page                    |
| `Ctrl+d`  | Move cursor and screen down half a page      |
| `Ctrl+u`  | Move cursor and screen up half a page        |

### Word movement

| Command | Description                                            |
| -------- | --------------------------------------------------------- |
| `w`     | Jump to start of next word                             |
| `W`     | Jump to start of next word (WORD, punctuation-inclusive) |
| `e`     | Jump to end of word                                    |
| `E`     | Jump to end of WORD                                    |
| `b`     | Jump backwards to start of word                        |
| `B`     | Jump backwards to start of WORD                         |
| `ge`    | Jump backwards to end of word                          |
| `gE`    | Jump backwards to end of WORD                           |

### Line & document movement

| Command       | Description                                    |
| -------------- | ------------------------------------------------- |
| `0`           | Jump to start of line                          |
| `^`           | Jump to first non-blank character of line      |
| `$`           | Jump to end of line                            |
| `g_`          | Jump to last non-blank character of line       |
| `gg`          | Go to first line of document                   |
| `G`           | Go to last line of document                    |
| `5gg` / `5G`  | Go to line 5                                   |
| `}`           | Jump to next paragraph / block                 |
| `{`           | Jump to previous paragraph / block             |
| `%`           | Move to matching bracket                       |
| `gd`          | Move to local declaration                      |
| `gD`          | Move to global declaration                     |

### Character search

| Command | Description                                     |
| -------- | -------------------------------------------------- |
| `fx`    | Jump to next occurrence of character x          |
| `tx`    | Jump to before next occurrence of x             |
| `Fx`    | Jump to previous occurrence of x                |
| `Tx`    | Jump to after previous occurrence of x          |
| `;`     | Repeat previous f/t/F/T movement                |
| `,`     | Repeat previous f/t/F/T movement, backwards     |

> Prefix a movement with a number to repeat it — `4j` moves down 4 lines.

## Insert mode

| Command    | Description                                       |
| ----------- | ---------------------------------------------------- |
| `i`        | Insert before cursor                              |
| `I`        | Insert at beginning of line                       |
| `a`        | Insert (append) after cursor                      |
| `A`        | Insert (append) at end of line                    |
| `o`        | Open a new line below                             |
| `O`        | Open a new line above                              |
| `ea`       | Insert at end of word                             |
| `Ctrl+h`   | Delete character before cursor                    |
| `Ctrl+w`   | Delete word before cursor                          |
| `Ctrl+j`   | Add a line break at cursor                        |
| `Ctrl+t`   | Indent line one shiftwidth                        |
| `Ctrl+d`   | De-indent line one shiftwidth                     |
| `Ctrl+n`   | Insert next autocomplete match                    |
| `Ctrl+p`   | Insert previous autocomplete match                 |
| `Ctrl+r x` | Insert contents of register x                     |
| `Ctrl+o x` | Temporarily enter normal mode for one command     |
| `Esc`      | Exit insert mode                                  |

## Editing

| Command       | Description                                        |
| -------------- | ----------------------------------------------------- |
| `r`           | Replace a single character                        |
| `R`           | Replace until `Esc` is pressed                     |
| `J`           | Join line below with a space                       |
| `gJ`          | Join line below without a space                    |
| `gwip`        | Reflow paragraph                                   |
| `cc`          | Change entire line                                 |
| `c$` / `C`    | Change to end of line                               |
| `ciw`         | Change entire word                                 |
| `cw` / `ce`   | Change to end of word                               |
| `s`           | Delete character and substitute text                |
| `S`           | Delete line and substitute text                     |
| `xp`          | Transpose two letters                              |
| `u`           | Undo                                                |
| `U`           | Restore last changed line                           |
| `Ctrl+r`      | Redo                                                |
| `.`           | Repeat last command                                |

### Case changing

| Command | Description                    |
| -------- | --------------------------------- |
| `g~`    | Switch case up to motion         |
| `gu`    | Lowercase up to motion           |
| `gU`    | Uppercase up to motion           |

## Visual mode

| Command   | Description                                     |
| ---------- | --------------------------------------------------- |
| `v`       | Start visual mode                                |
| `V`       | Start linewise visual mode                       |
| `Ctrl+v`  | Start visual block mode                          |
| `o`       | Move to other end of marked area                 |
| `O`       | Move to other corner of block                     |
| `aw`      | Mark a word                                      |
| `ab`      | A block with `()`                                |
| `aB`      | A block with `{}`                                |
| `at`      | A block with `<>` tags                           |
| `ib`      | Inner block with `()`                            |
| `iB`      | Inner block with `{}`                            |
| `it`      | Inner block with `<>` tags                       |
| `>`       | Shift text right                                 |
| `<`       | Shift text left                                  |
| `y`       | Yank marked text                                 |
| `d`       | Delete marked text                               |
| `~`       | Switch case                                      |

## Registers

| Command    | Description                             |
| ----------- | ------------------------------------------ |
| `:reg[isters]` | Show register contents               |
| `"xy`      | Yank into register x                    |
| `"xp`      | Paste from register x                    |
| `"+y`      | Yank into the system clipboard           |
| `"+p`      | Paste from the system clipboard          |

Special registers: `0` last yank, `"` unnamed (last delete/yank), `%` current filename, `#` alternate filename, `*`/`+` clipboard contents, `/` last search pattern, `:` last command-line, `.` last inserted text, `-` last small delete, `_` black hole register.

## Marks, jumps, and macros

| Command       | Description                          |
| -------------- | --------------------------------------- |
| `:marks`      | List of marks                        |
| `ma`          | Set mark A at current position       |
| `` `a ``      | Jump to mark A                       |
| `` `0 ``      | Go to position where Vim last exited |
| `:ju[mps]`    | List of jumps                        |
| `:changes`    | List of changes                      |
| `Ctrl+i`      | Newer position in jump list          |
| `Ctrl+o`      | Older position in jump list          |
| `qa`          | Record macro a                       |
| `q`           | Stop recording macro                 |
| `@a`          | Run macro a                          |
| `@@`          | Rerun last run macro                 |

## Cut and paste

| Command    | Description                                       |
| ----------- | ----------------------------------------------------- |
| `yy`       | Yank a line                                        |
| `2yy`      | Yank 2 lines                                       |
| `yw`       | Yank to start of next word                          |
| `yiw`      | Yank word under cursor                              |
| `y$` / `Y` | Yank to end of line                                 |
| `p`        | Paste after cursor                                 |
| `P`        | Paste before cursor                                |
| `dd`       | Delete (cut) a line                                |
| `dw`       | Delete to start of next word                        |
| `diw`      | Delete word under cursor                            |
| `x`        | Delete character                                   |

### Delete ranges

| Command                | Description                             |
| ------------------------ | ------------------------------------------ |
| `:3,5d`                 | Delete lines 3 to 5                     |
| `:.,$d`                 | Delete from current line to end of file |
| `:g/{pattern}/d`        | Delete all lines containing pattern     |
| `:g!/{pattern}/d`       | Delete all lines NOT containing pattern |

## Indent text

| Command   | Description                              |
| ---------- | ------------------------------------------- |
| `>>`      | Indent line one shiftwidth               |
| `<<`      | De-indent line one shiftwidth            |
| `3==`     | Re-indent 3 lines                        |
| `gg=G`    | Re-indent entire buffer                  |
| `]p`      | Paste and adjust indent to current line  |

## Exiting

| Command                | Description                          |
| ------------------------ | --------------------------------------- |
| `:w`                    | Save without exiting                 |
| `:w !sudo tee %`        | Save using sudo                      |
| `:wq` / `:x` / `ZZ`     | Save and quit                        |
| `:q`                    | Quit (fails on unsaved changes)      |
| `:q!` / `ZQ`            | Quit and discard unsaved changes     |
| `:wqa`                  | Save and quit on all tabs            |

## Search and replace

| Command                 | Description                                       |
| -------------------------- | ------------------------------------------------------ |
| `/pattern`               | Search forward for pattern                        |
| `?pattern`               | Search backward for pattern                       |
| `n` / `N`                | Repeat search, same / opposite direction          |
| `:%s/old/new/g`          | Replace all `old` with `new`                      |
| `:%s/old/new/gc`         | Replace all with confirmation                     |
| `:noh[lsearch]`          | Clear search highlighting                          |

## Tabs, buffers, and windows

| Command       | Description                                     |
| -------------- | ---------------------------------------------------- |
| `:tabnew`     | Open a file in a new tab                        |
| `gt` / `gT`   | Next / previous tab                              |
| `:e[dit] file`| Edit a file in a new buffer                      |
| `:bn` / `:bp` | Next / previous buffer                           |
| `:ls`         | List all open buffers                            |
| `:sp[lit]`    | Split window horizontally                        |
| `:vs[plit]`   | Split window vertically                          |
| `Ctrl+ww`     | Switch windows                                   |
| `Ctrl+w=`     | Make all windows equal size                      |

### Pro tip

Vim mastery comes from composing commands: **Operator + Motion = Power**. Examples: `daw` (delete around word), `ci(` (change inside parentheses), `yap` (yank around paragraph), `gUiw` (uppercase inner word).
