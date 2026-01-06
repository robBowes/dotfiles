# Neovim Configuration Guide

## Overview

Your Neovim setup is a fully-featured development environment built on Lazy.nvim with extensive plugin support for TypeScript, Lua, and Python development.

---

## Page 1: Core Features

### UI & Appearance

- **Catppuccin Theme** - Dark mocha colorscheme with git integration
- **Lualine Status Bar** - Shows mode, file info, git branch, and diagnostics
- **NvimTree File Explorer** - Sidebar file browser with git awareness
- **Which-key** - Shows available keybindings as you type
- **Alpha Dashboard** - Startup screen with quick action buttons

### Navigation & Search

- **Telescope** - Fuzzy finder for files, text search, buffers, and help tags
- **Harpoon** - Quick jump between 4 marked files
- **Leap** - Fast character-based navigation (type two chars to jump anywhere)
- **Tmux Integration** - Seamless navigation between nvim and tmux splits

### Code Features

- **LSP (Language Server Protocol)** - Configured for TypeScript, Lua, and Python
  - Real-time diagnostics and error reporting
  - Intelligent autocompletion with snippets
  - Code actions and refactoring
- **Treesitter** - Advanced syntax highlighting for 12+ languages
- **Conform** - Auto-formatting on save (Prettier, Stylua, Black)
- **Auto-pairs** - Auto-completes brackets, quotes, etc.
- **Surround** - Quick bracket/quote manipulation

### Editing Tools

- **Terminal** - Built-in terminal with Lazygit integration
- **Spectre** - Project-wide search and replace
- **Comment.nvim** - Toggle comments with ease
- **Git Signs** - Visual git diff markers in the gutter
- **Git Blame** - Inline git blame (toggled with `:GitBlameToggle`)
- **Todo Comments** - Highlights TODO/FIXME comments
- **Zen Mode** - Distraction-free writing (120 char width)

### Additional Tools

- **Trouble** - Diagnostic panel with all errors/warnings
- **Markdown Preview** - Live preview for markdown files
- **Undo History** - Persistent undo across sessions

---

## Page 2: Keyboard Shortcuts

### File & Project Operations

| Shortcut           | Action                    |
| ------------------ | ------------------------- |
| `<leader>ff`       | Find files in project     |
| `<leader>fg`       | Live grep (search text)   |
| `<leader>fb`       | Find buffers (open files) |
| `<leader>fh`       | Find help tags            |
| `<leader><leader>` | Find files (alternate)    |
| `<leader>e`        | Toggle file tree          |
| `<leader>w`        | Save file                 |
| `<leader>q`        | Quit                      |
| `<leader>Q`        | Force quit all            |

### Buffer Management

| Shortcut     | Action                |
| ------------ | --------------------- |
| `<leader>bn` | Next buffer           |
| `<leader>bp` | Previous buffer       |
| `<leader>bd` | Delete buffer         |
| `]b`         | Next buffer (alt)     |
| `[b`         | Previous buffer (alt) |

### LSP & Diagnostics

| Shortcut     | Action                    |
| ------------ | ------------------------- |
| `gd`         | Go to definition          |
| `gr`         | Go to references          |
| `K`          | Hover documentation       |
| `<leader>ca` | Code actions              |
| `<leader>rn` | Rename symbol             |
| `<leader>xx` | Toggle diagnostics panel  |
| `<leader>xd` | Toggle buffer diagnostics |
| `]q`         | Next quickfix item        |
| `[q`         | Previous quickfix item    |

### Harpoon (Quick Navigation)

| Shortcut    | Action                      |
| ----------- | --------------------------- |
| `<leader>a` | Add current file to harpoon |
| `<leader>h` | Toggle harpoon menu         |
| `<leader>1` | Jump to harpoon file 1      |
| `<leader>2` | Jump to harpoon file 2      |
| `<leader>3` | Jump to harpoon file 3      |
| `<leader>4` | Jump to harpoon file 4      |

### Leap Navigation

| Shortcut     | Action                     |
| ------------ | -------------------------- |
| `s`          | Leap within current window |
| `S`          | Leap across all windows    |
| `s` (visual) | Leap in visual mode        |

### Text Editing

| Shortcut     | Action                                |
| ------------ | ------------------------------------- |
| `<leader>cf` | Format buffer (prettier/stylua/black) |
| `<leader>sr` | Search and replace (Spectre)          |
| `gcc`        | Toggle comment (line)                 |
| `gc`         | Toggle comment (selection)            |
| `cs"'`       | Change quotes from " to ' (surround)  |
| `ds"`        | Delete surrounding quotes             |
| `ys`         | Add surrounding brackets              |

### Window & Split Management

| Shortcut     | Action               |
| ------------ | -------------------- |
| `<leader>sv` | Vertical split       |
| `<leader>sh` | Horizontal split     |
| `<leader>se` | Equalize split sizes |
| `<leader>sx` | Close split          |
| `<C-h>`      | Move to left window  |
| `<C-j>`      | Move to down window  |
| `<C-k>`      | Move to up window    |
| `<C-l>`      | Move to right window |

### Scrolling & Movement

| Shortcut     | Action                            |
| ------------ | --------------------------------- |
| `<C-d>`      | Scroll down (centered)            |
| `<C-u>`      | Scroll up (centered)              |
| `n`          | Next search result (centered)     |
| `N`          | Previous search result (centered) |
| `J` (visual) | Move selection down               |
| `K` (visual) | Move selection up                 |

### Clipboard & Selection

| Shortcut     | Action                          |
| ------------ | ------------------------------- |
| `<leader>y`  | Yank to system clipboard        |
| `<leader>Y`  | Yank line to system clipboard   |
| `<leader>d`  | Delete without yanking          |
| `<leader>p`  | Paste without yanking selection |
| `<` (visual) | Dedent (keep selection)         |
| `>` (visual) | Indent (keep selection)         |

### Terminal & Tools

| Shortcut     | Action                  |
| ------------ | ----------------------- |
| `<C-\>`      | Toggle terminal         |
| `<leader>tg` | Toggle lazygit          |
| `<leader>z`  | Toggle zen mode         |
| `<leader>mp` | Toggle markdown preview |
| `Esc`        | Clear search highlight  |

---

## Tips

- **Space is your leader key** - All custom shortcuts start with `<space>`
- **Use which-key** - Press space and wait to see available shortcuts
- **Leap is powerful** - Type `s` + 2 characters to jump anywhere on screen
- **Harpoon marks files** - Great for jumping between frequently edited files
- **LSP is automatic** - When you enter a TypeScript/Lua/Python file, LSP activates
- **Format on save** - Code auto-formats when you save (unless disabled)
