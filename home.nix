{ config, pkgs, ... }:

{
    home.username = "robbowes";
    home.homeDirectory = "/Users/robbowes";
    home.stateVersion = "22.11";

    programs.home-manager.enable = true;

    home.packages = [ pkgs.zsh-autosuggestions pkgs.autojump pkgs.python pkgs.tmux pkgs.nodejs-18_x ];

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
         shellAliases = {
            gs = "git status";
        };
    };

}

