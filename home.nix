{ config, pkgs, ... }:

{
  home.username = "robbowes";
  home.homeDirectory = "/Users/robbowes";
  home.stateVersion = "22.11";

  programs.home-manager.enable = true;

  home.packages = [ pkgs.zsh-autosuggestions pkgs.autojump pkgs.python3 pkgs.tmux pkgs.nodejs-18_x pkgs.nodePackages.pnpm pkgs.grpcurl pkgs.awscli2 pkgs.nixpkgs-fmt pkgs.jdk11 pkgs.shellcheck pkgs.postgresql_15 pkgs.ffmpeg pkgs.deno ];

  programs.direnv.enable = true;
  programs.direnv.nix-direnv.enable = true;

  programs.autojump = {
    enable = true;
  };

  programs.zsh = {
    # Your zsh config
    enable = true;
    enableAutosuggestions = true;
    oh-my-zsh = {
      enable = true;
      plugins = [ "git" "autojump" ];
      theme = "robbyrussell";
    };
    initExtra = ''
      source ./init.sh
    '';

  };
}
