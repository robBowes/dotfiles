# Neovim Setup

Neovim configured via `~/.config/nvim/init.lua` with [lazy.nvim](https://github.com/folke/lazy.nvim) as plugin manager.

## Home Manager (Flake)

```bash
# Apply config
home-manager switch --flake .#robbowes --extra-experimental-features 'nix-command flakes'

# Update flake inputs
nix flake update --extra-experimental-features 'nix-command flakes'
```

## Plugins

| Plugin | Purpose |
|--------|---------|
| catppuccin | Colorscheme (mocha) |
| nvim-treesitter | Syntax highlighting |
| telescope.nvim | Fuzzy finder |
| nvim-lspconfig | LSP support |
| mason.nvim | LSP/tool installer |
| nvim-cmp | Autocompletion |
| nvim-tree | File explorer |
| lualine | Status line |
| gitsigns | Git signs in gutter |
| which-key | Keybinding hints |
| nvim-autopairs | Auto close brackets |
| Comment.nvim | Toggle comments (gcc/gc) |
| toggleterm | Terminal integration |
| harpoon | Quick file navigation |
| zen-mode | Distraction-free editing |
| alpha-nvim | Dashboard |
| vim-tmux-navigator | Seamless tmux/nvim splits |
| git-blame | Inline git blame |
| nvim-surround | Surround text objects |
| leap.nvim | Fast cursor movement |
| trouble.nvim | Diagnostics list |
| todo-comments | Highlight TODOs |
| nvim-spectre | Search & replace |
| markdown-preview | Live markdown preview |

## Keybindings

Leader key: `<Space>`

### Files & Navigation

| Key | Action |
|-----|--------|
| `<Space><Space>` | Find files |
| `<Space>ff` | Find files |
| `<Space>fg` | Live grep |
| `<Space>fb` | Buffers |
| `<Space>fh` | Help tags |
| `<Space>e` | Toggle file tree |

### Harpoon (Quick Files)

| Key | Action |
|-----|--------|
| `<Space>a` | Add file to harpoon |
| `<Space>h` | Harpoon menu |
| `<Space>1-4` | Jump to harpoon slot 1-4 |

### LSP

| Key | Action |
|-----|--------|
| `gd` | Go to definition |
| `gr` | Go to references |
| `K` | Hover docs |
| `<Space>ca` | Code action |
| `<Space>rn` | Rename symbol |

### Git

| Key | Action |
|-----|--------|
| `<Space>tg` | Lazygit (floating) |
| `:GitBlameToggle` | Toggle inline blame |

### Terminal

| Key | Action |
|-----|--------|
| `<C-\>` | Toggle terminal |
| `<Space>tg` | Lazygit |

### Buffers

| Key | Action |
|-----|--------|
| `]b` / `[b` | Next/prev buffer |
| `<Space>bn` | Next buffer |
| `<Space>bp` | Prev buffer |
| `<Space>bd` | Delete buffer |

### Quickfix

| Key | Action |
|-----|--------|
| `]q` / `[q` | Next/prev quickfix |

### Splits

| Key | Action |
|-----|--------|
| `<C-h/j/k/l>` | Navigate splits (tmux aware) |
| `<Space>sv` | Vertical split |
| `<Space>sh` | Horizontal split |
| `<Space>se` | Equal splits |
| `<Space>sx` | Close split |

### Editing

| Key | Action |
|-----|--------|
| `gcc` | Toggle line comment |
| `gc` (visual) | Toggle comment |
| `ys{motion}{char}` | Surround with char |
| `ds{char}` | Delete surrounding |
| `cs{old}{new}` | Change surrounding |
| `s{char}{char}` | Leap to location |
| `<` / `>` (visual) | Indent (keeps selection) |
| `J` / `K` (visual) | Move lines up/down |

### Search & Replace

| Key | Action |
|-----|--------|
| `<Space>sr` | Open Spectre (search/replace) |
| `<Esc>` | Clear search highlight |
| `n` / `N` | Next/prev match (centered) |

### Diagnostics

| Key | Action |
|-----|--------|
| `<Space>xx` | Toggle diagnostics list |
| `<Space>xd` | Buffer diagnostics |

### Misc

| Key | Action |
|-----|--------|
| `<Space>z` | Zen mode |
| `<Space>mp` | Markdown preview |
| `<Space>w` | Save |
| `<Space>q` | Quit |
| `<Space>Q` | Quit all (force) |
| `<C-d>` / `<C-u>` | Scroll half page (centered) |

### Clipboard

| Key | Action |
|-----|--------|
| `<Space>y` | Yank to system clipboard |
| `<Space>Y` | Yank line to system clipboard |
| `<Space>d` | Delete without yanking |
| `<Space>p` (visual) | Paste without yanking selection |

## LSP Servers (via Mason)

Auto-installed on first launch:
- `ts_ls` - TypeScript/JavaScript
- `lua_ls` - Lua
- `pyright` - Python

Add more in `init.lua` under `mason-lspconfig.ensure_installed`.

## Treesitter Languages

Auto-installed: lua, typescript, javascript, tsx, json, html, css, markdown, nix, python, rust, go

## File Locations

- Config: `~/.config/nvim/init.lua`
- Plugins: `~/.local/share/nvim/lazy/`
- Mason tools: `~/.local/share/nvim/mason/`

## Maintenance

```bash
# Update plugins (inside nvim)
:Lazy update

# Update LSP servers
:Mason

# Clear all plugin data (nuclear option)
rm -rf ~/.local/share/nvim/lazy
```
