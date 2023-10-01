#!/bin/bash

# Aliases
alias gs='git status'
alias awsssh="deno run --allow-all https://deno.land/x/aws_sm@0.0.6/main.ts"
alias papi="pnpm -F api.vesselfunds.com"
alias pweb="pnpm -F vesselfunds.com"

# Functions

nixify() {

    if [ ! -e ./.envrc ]; then
        echo "use nix" >.envrc
        direnv allow
    fi
    if [[ ! -e shell.nix ]] && [[ ! -e default.nix ]]; then
        # Make a default shell.nix and then pop open an editor
        niv init --latest
        cat >shell.nix <<'EOF'
let
  sources = import ./nix/sources.nix;
  pkgs = import sources.nixpkgs {};
in
pkgs.mkShell {
  buildInputs = [
    pkgs.nodejs-18_x
  ];
}
EOF
        vim shell.nix
    fi
}
