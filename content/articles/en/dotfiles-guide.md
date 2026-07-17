# My Linux Setup & Configuration

This document is my personal guide for all the settings, software, and customizations I use on my Linux system.

## Software Installation

A list of the essential software I use, along with their installation commands or sources.

| Application              | Install Command / Source                                                           | Notes                                 |
| ------------------------ | ---------------------------------------------------------------------------------- | ------------------------------------- |
| **WhatsApp**             | `flatpak install flathub io.github.mimbrero.WhatsAppDesktop`                       | Unofficial Flatpak version            |
| **Telegram**             | `flatpak install flathub org.telegram.desktop`                                     | Official Version                      |
| **Discord**              | Official Website (`.deb`)                                                          |                                       |
| **STM32CubeIDE**         | Official Website                                                                   | IDE for STM32 development             |
| **STM32CubeMX**          | Official Website                                                                   | Code generation tool                  |
| **VS Code**              | `sudo apt install code`                                                            | Code Editor                           |
| **Windscribe**           | Official Website (`.deb`)                                                          | VPN Service (Corrected from Windsurf) |
| **Vysor**                | Official Website                                                                   | Mirror phone screen to computer       |
| **SMPlayer**             | `sudo apt install smplayer`                                                        | Media Player                          |
| **Neovim**               | `sudo apt install neovim`                                                          | Advanced Text Editor                  |
| **Bottles**              | `flatpak install flathub com.usebottles.bottles`                                   | Run Windows software                  |
| **AnyDesk**              | Official Website (`.deb`)                                                          | Remote Desktop Access                 |
| **OnlyOffice**           | `sudo apt install onlyoffice-desktopeditors`                                       | Office Suite                          |
| **GIMP**                 | `flatpak install flathub org.gimp.GIMP`                                            | Image Editor                          |
| **OBS Studio**           | `sudo apt install obs-studio`                                                      | Recording & Streaming                 |
| **Foxit Reader**         | Official Website (`.deb`)                                                          | PDF Reader                            |
| **Serial Port Terminal** | `sudo apt install cutecom`                                                         | GUI for serial devices                |
| **PuTTY**                | `sudo apt install putty`                                                           | SSH and Telnet client                 |
| **Tilix**                | `sudo apt install tilix`                                                           | Tiling Terminal Emulator              |
| **zsh**                  | `sudo apt install zsh`                                                             | Alternative Shell                     |
| **clangd**               | `sudo apt install clangd`                                                          | Language server for C/C++             |
| **Git**                  | `sudo apt install git`                                                             | Version Control System                |
| **Firefox**              | `sudo apt install firefox`                                                         | Web Browser                           |
| **gcc**                  | `sudo apt install gcc`                                                             | C Compiler                            |
| **clang-format**         | `sudo apt install clang-format`                                                    | Code Formatter                        |
| **FDM**                  | Official Website (`.deb`)                                                          | Free Download Manager                 |
| **fzf**                  | `git clone --depth 1 https://github.com/junegunn/fzf.git ~/.fzf && ~/.fzf/install` | Command-line fuzzy finder             |
| **Gnome SW Plugin**      | `sudo apt install gnome-software-plugin-snap`                                      | Snap plugin for GNOME Software        |
| **gromit-mpx**           | `sudo apt install gromit-mpx`                                                      | draw on screen                        |

---

## GNOME Extensions

A list of extensions I use to enhance the GNOME desktop experience.

| Extension                                    | Purpose                                                           |
| -------------------------------------------- | ----------------------------------------------------------------- |
| **Blur My Shell**                            | Applies a blur effect to the shell overview and top panel.        |
| **Burn My Windows**                          | Adds destructive window-closing effects.                          |
| **Clipboard Indicator**                      | A simple and powerful clipboard manager.                          |
| **Compiz Windows Effect**                    | Adds wobbly window effects like Compiz.                           |
| **Dash to Dock**                             | Transforms the dash into a configurable dock.                     |
| **Dash to Panel**                            | Combines the dash and top panel into a single panel.              |
| **Desktop Widget (Clock)**                   | Adds a clock widget to the desktop.                               |
| **GSConnect**                                | Integrates your phone with the GNOME desktop.                     |
| **Just Perfection**                          | A comprehensive tool to customize the GNOME Shell.                |
| **Lock Screen Background**                   | Sets a custom background for the lock screen.                     |
| **Vitals**                                   | Displays system temperature, voltage, fan speed, etc.             |
| **Apps Menu**                                | Adds a traditional application menu.                              |
| **Auto Move Windows**                        | Automatically moves applications to specific workspaces.          |
| **System Monitor**                           | Displays system resource usage in the top panel.                  |
| **Ubuntu AppIndicator**                      | Supports application indicators in the top panel.                 |
| **Ubuntu Tiling Assistant**                  | Enhances window tiling functionality.                             |
| Coverflow Alt-Tab                            | Replaces the standard Alt-Tab with a 3D coverflow style switcher. |
| Desktop Cube                                 | Adds a 3D cube effect when switching between workspaces.          |
| Gnome Fuzzy App Search                       | Enables fuzzy searching for apps in the activities overview.      |
| Screenshot windows sizer                     | Resizes windows to standard sizes for perfect screenshots.        |
| search light                                 | Adds a floating, Spotlight-like search bar to the desktop         |
| Tilling Shell                                | Provides an advanced tiling window management system.             |
| Status Area Horizontal Spacing               | Allows customizing the gap between icons in the top bar.          |
| Tilling Assistant                            | Adds Windows-like snap assist and advanced tiling layouts.        |
| Appindicator and KStatusNotification Support | Ensures legacy tray icons appear correctly in the top panel.      |

---

## Customization

### Appearance

|Setting|Value|
|---|---|
|**Mouse Cursor**|Bibata-modern-ice|
|**Icons**|Yaru|
|**Legacy Applications**|Yaru-dark|

### Fonts

| Setting            | Value          |     |
| ------------------ | -------------- | --- |
| **Interface Text** | PoetsenOne     |     |
| **Document Text**  | PoetsenOne     |     |
| **Monospace Text** | Fira Code Bold |     |

> **Note:** Some configurations in Neovim, especially icons, may not work properly **unless the monospace font is set to** _**Fira Code Bold**_.

### Default Applications

| File Type    | Program      |
| ------------ | ------------ |
| **PDF**      | Foxit Reader |
| **Video**    | SMPlayer     |
| **Terminal** | Tilix        |
| **Shell**    | Zsh          |
| **Editor**   | nvim         |
| **Browser**  | Firefox      |

in **fedora** to make **open in tilix** in nautilus :

```bash
sudo dnf remove ptyxis # to remove open on console
sudo dnf install tilix-nautilus # to add open in tilix here in nautilus
```

## System Tweaks

|Area|Setting|Value|
|---|---|---|
|**Keyboard**|Layout|English (US, euro on 5)|

---

## Removing Menu Entries (Memory Test & UEFI Settings)

To simplify the GRUB menu, remove execute permissions from the corresponding scripts.

```bash
# Remove the Memory Test option
sudo chmod -x /etc/grub.d/20_memtest86+

# Remove the UEFI Firmware Settings option
sudo chmod -x /etc/grub.d/30_uefi-firmware
```

#### then Update GRUB to Apply

```bash
sudo update-grub
```

---

## Speeding Up Boot Time

Disable the service that waits for the network to be configured on startup.

1. **Disable and mask the service:**

    ```bash
    sudo systemctl disable NetworkManager-wait-online.service
    sudo systemctl mask NetworkManager-wait-online.service
    ```

2. **To re-enable it in the future:**

    ```bash
    sudo systemctl unmask NetworkManager-wait-online.service
    sudo systemctl enable NetworkManager-wait-online.service
    ```

#### How to Analyze Boot Time

1. **Get the total boot time:**

    ```bash
    systemd-analyze
    ```

2. **List services by initialization time:**

    ```bash
    systemd-analyze blame | head -n 20
    ```

---
