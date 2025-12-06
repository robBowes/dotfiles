{ config, pkgs, lib, neovim-flake, system, ... }:
{
  home.username = "robbowes";
  home.homeDirectory = "/Users/robbowes";
  home.stateVersion = "25.05";

  programs.home-manager.enable = true;

  home.packages = [
    # Existing packages
    pkgs.zsh-autosuggestions
    pkgs.autojump
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
    pkgs.claude-code
    pkgs."_1password-cli"
    pkgs.yarn
    pkgs.codex

    # Neovim from flake
    neovim-flake.packages.${system}.default
  ];

  programs.direnv.enable = true;
  programs.direnv.nix-direnv.enable = true;

  programs.autojump = {
    enable = true;
  };

  programs.zsh = {
    enable = true;
    autosuggestion.enable = true;
    oh-my-zsh = {
      enable = true;
      plugins = [ "git" "autojump" "docker"];
      theme = "robbyrussell";
    };

    initExtra = lib.mkOrder 550''
      ulimit -n 524288 && echo "Successfully set to 524288" || echo "Failed to set to 524288";
      source ~/init.sh;
    '';
    shellAliases = {
      web = "pnpm -F vesselfunds.com";
      api = "pnpm -F api.vesselfunds.com";
      rpc = "pnpm -F rpc";
    };
  };
}
