{ config, pkgs, ... }:

{
    home.username = "robbowes";
    home.homeDirectory = "/Users/robbowes";
    home.stateVersion = "22.11";

    programs.home-manager.enable = true;

    home.packages = [ pkgs.zsh-autosuggestions pkgs.autojump pkgs.python ];

    programs.direnv.enable = true;
    programs.direnv.nix-direnv.enable = true;
    # optional for nix flakes support in home-manager 21.11, not required in home-manager unstable or 22.05
    #  programs.direnv.nix-direnv.enableFlakes = true;

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

