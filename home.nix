{ config, pkgs, lib, ... }:
let
  unstable = import <nixpkgs-unstable> { config = { allowUnfree = true; }; };
in
{
  home.username = "robbowes";
  home.homeDirectory = "/Users/robbowes";
  home.stateVersion = "25.05";
  home.sessionPath = [ "/Volumes/dev/git/dotfiles/.bin" ];

  programs.home-manager.enable = true;

  home.packages = [
    # Existing packages
    pkgs.zsh-autosuggestions
    pkgs.python3
    pkgs.tmux
    pkgs.nodejs-slim_22
    pkgs.nodePackages.pnpm
    pkgs.grpcurl
    pkgs.awscli2
    pkgs.nixpkgs-fmt
    pkgs.jdk11
    pkgs.shellcheck
    pkgs.postgresql_15
    pkgs.ffmpeg
    pkgs.deno
    pkgs.ripgrep
    unstable.claude-code
    pkgs."_1password-cli"
    pkgs.yarn
    pkgs.codex
    pkgs.neovim
    pkgs.lazygit
    pkgs.fd  # for telescope
    pkgs.pandoc
    pkgs.gh

    # Modern terminal tools
    pkgs.eza              # modern ls
    pkgs.bat              # better cat
    pkgs.delta            # git diffs
    pkgs.jq               # json processing
    pkgs.btop             # resource monitor
    pkgs.tldr             # quick man pages
    pkgs.zsh-syntax-highlighting
  ];

  programs.direnv.enable = true;
  programs.direnv.nix-direnv.enable = true;

  programs.fzf = {
    enable = true;
    enableZshIntegration = true;
  };

  programs.starship.enable = true;

  programs.zoxide = {
    enable = true;
    enableZshIntegration = true;
  };

  programs.zsh = {
    enable = true;
    autosuggestion.enable = true;
    oh-my-zsh = {
      enable = true;
      plugins = [ "git" "docker" ];
      theme = "";  # disabled, starship handles prompt
    };

    initExtra = lib.mkOrder 550''
      ulimit -n 524288 && echo "Successfully set to 524288" || echo "Failed to set to 524288";
      source ~/init.sh;

      # Reminder wrappers for modern alternatives
      function man() {
        echo "💡 try 'tldr $1' for quick examples"
        command man "$@"
      }

      function htop() {
        echo "💡 try 'btop' for a more modern view"
        command htop "$@"
      }
    '';
    shellAliases = {
      # Project shortcuts
      web = "pnpm -F vesselfunds.com";
      api = "pnpm -F api.vesselfunds.com";
      rpc = "pnpm -F rpc";

      # Modern tool aliases
      ls = "eza --icons --git";
      ll = "eza -la --icons --git";
      la = "eza -a --icons --git";
      lt = "eza --tree --icons --git";
      cat = "bat";
      j = "z";  # autojump muscle memory -> zoxide
    };
  };
}
