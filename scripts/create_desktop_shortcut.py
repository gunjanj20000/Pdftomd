#!/usr/bin/env python3
"""
Cross-Platform Desktop Shortcut Creator for PDF to MD Studio.
Creates a desktop shortcut with application icon on Linux, Windows, and macOS.
"""
import os
import sys
import subprocess
from pathlib import Path


def get_root_dir() -> Path:
    # This script is in <root>/scripts/create_desktop_shortcut.py
    return Path(__file__).resolve().parent.parent


def create_linux_shortcut(root_dir: Path) -> bool:
    # 1. Determine Desktop folder
    desktop_dir = None
    try:
        out = subprocess.check_output(["xdg-user-dir", "DESKTOP"], text=True).strip()
        if out and Path(out).parent.exists():
            desktop_dir = Path(out)
    except Exception:
        pass

    if not desktop_dir:
        desktop_dir = Path.home() / "Desktop"

    desktop_dir.mkdir(parents=True, exist_ok=True)

    start_sh = (root_dir / "scripts" / "start.sh").resolve()
    icon_png = (root_dir / "assets" / "icon.png").resolve()
    icon_svg = (root_dir / "assets" / "icon.svg").resolve()
    icon_path = icon_png if icon_png.exists() else icon_svg

    # Ensure start.sh is executable
    if start_sh.exists():
        os.chmod(start_sh, 0o755)

    desktop_entry_content = f"""[Desktop Entry]
Version=1.0
Type=Application
Name=PDF to MD Studio
GenericName=PDF to Markdown & Sliced Chapters Studio
Comment=Transform PDF books into clean Markdown or sliced PDF chapters
Exec=/usr/bin/env bash "{start_sh}"
Path={root_dir}
Icon={icon_path}
Terminal=true
Categories=Office;Utility;Publishing;
StartupNotify=true
"""

    created_any = False

    # 1. Place on Desktop
    shortcut_path = desktop_dir / "pdf-to-md-studio.desktop"
    try:
        with open(shortcut_path, "w", encoding="utf-8") as f:
            f.write(desktop_entry_content)
        os.chmod(shortcut_path, 0o755)

        # Mark as trusted in GNOME if gio is available
        try:
            subprocess.run(["gio", "set", str(shortcut_path), "metadata::trusted", "true"], check=False, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        except Exception:
            pass

        print(f"✓ Created Linux Desktop shortcut: {shortcut_path}")
        created_any = True
    except Exception as e:
        print(f"! Warning: Could not write to Desktop shortcut: {e}")

    # 2. Also register in Applications Menu (~/.local/share/applications)
    apps_dir = Path.home() / ".local" / "share" / "applications"
    try:
        apps_dir.mkdir(parents=True, exist_ok=True)
        app_menu_shortcut = apps_dir / "pdf-to-md-studio.desktop"
        with open(app_menu_shortcut, "w", encoding="utf-8") as f:
            f.write(desktop_entry_content)
        os.chmod(app_menu_shortcut, 0o755)
        print(f"✓ Registered in system Application Launcher: {app_menu_shortcut}")
        created_any = True
    except Exception as e:
        print(f"! Warning: Could not write to applications menu: {e}")

    return created_any


def create_windows_shortcut(root_dir: Path) -> bool:
    start_bat = (root_dir / "scripts" / "start.bat").resolve()
    icon_ico = (root_dir / "assets" / "icon.ico").resolve()
    icon_png = (root_dir / "assets" / "icon.png").resolve()
    icon_path = icon_ico if icon_ico.exists() else icon_png

    ps_script = f"""
$desktop = [Environment]::GetFolderPath('Desktop');
$ws = New-Object -ComObject WScript.Shell;
$s = $ws.CreateShortcut([System.IO.Path]::Combine($desktop, 'PDF to MD Studio.lnk'));
$s.TargetPath = '{start_bat}';
$s.WorkingDirectory = '{root_dir}';
$s.IconLocation = '{icon_path}';
$s.Description = 'PDF to Markdown & Sliced Chapters Studio';
$s.Save();
"""
    try:
        subprocess.run(["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", ps_script], check=True)
        print("✓ Created Windows Desktop shortcut: PDF to MD Studio.lnk")
        return True
    except Exception as e:
        print(f"! Error creating Windows shortcut via PowerShell: {e}")
        return False


def create_macos_shortcut(root_dir: Path) -> bool:
    desktop_dir = Path.home() / "Desktop"
    desktop_dir.mkdir(parents=True, exist_ok=True)

    start_command = (root_dir / "scripts" / "start.command").resolve()
    if start_command.exists():
        os.chmod(start_command, 0o755)

    shortcut_path = desktop_dir / "PDF to MD Studio.command"
    content = f"""#!/usr/bin/env bash
cd "{root_dir}"
exec "{start_command}"
"""
    try:
        with open(shortcut_path, "w", encoding="utf-8") as f:
            f.write(content)
        os.chmod(shortcut_path, 0o755)
        print(f"✓ Created macOS Desktop shortcut: {shortcut_path}")
        return True
    except Exception as e:
        print(f"! Error creating macOS shortcut: {e}")
        return False


def main():
    root_dir = get_root_dir()
    print(f"Creating Desktop shortcut for PDF to MD Studio in '{root_dir}'...")

    if sys.platform.startswith("linux"):
        create_linux_shortcut(root_dir)
    elif sys.platform.startswith("win32"):
        create_windows_shortcut(root_dir)
    elif sys.platform.startswith("darwin"):
        create_macos_shortcut(root_dir)
    else:
        # Fallback to linux/generic
        create_linux_shortcut(root_dir)


if __name__ == "__main__":
    main()
