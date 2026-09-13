<div align="center">
  <img src="src/assets/icon.png" width="96" height="96" alt="WhatsPulse Logo" />
  <h1>WhatsPulse</h1>
  <p><strong>A modern, blazingly fast, and privacy-focused WhatsApp Web desktop client powered by Rust & Tauri v2.</strong></p>

  <p>
    <a href="https://github.com/brilyyy/whatspulse/releases"><img src="https://img.shields.io/github/v/release/brilyyy/whatspulse?color=00e699&label=version&style=flat-square" alt="Version" /></a>
    <a href="https://www.rust-lang.org/"><img src="https://img.shields.io/badge/Rust-2021_Edition-orange?style=flat-square&logo=rust" alt="Rust" /></a>
    <a href="https://v2.tauri.app/"><img src="https://img.shields.io/badge/Tauri-v2-blue?style=flat-square&logo=tauri" alt="Tauri v2" /></a>
    <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-5.x-3178c6?style=flat-square&logo=typescript" alt="TypeScript" /></a>
    <img src="https://img.shields.io/badge/Platform-Linux-FCC624?style=flat-square&logo=linux&logoColor=black" alt="Linux" />
    <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-green?style=flat-square" alt="License" /></a>
  </p>
</div>

---

## 💡 Why WhatsPulse?

Most existing desktop wrappers for WhatsApp Web are built using Electron, resulting in heavy resource usage, sluggish startup times, and 500MB to 1GB+ of memory consumption. 

**WhatsPulse** is engineered from the ground up using **Tauri v2** and **WebKitGTK**:
- ⚡ **Lightweight & Fast**: Uses native OS WebViews (~10-15MB binary size, ~100MB RAM consumption).
- 🛡️ **Privacy by Design**: Granular blur filters, instant hover reveal, idle timeout shields, and an emergency Boss Key.
- 🎨 **Deep Customization**: 8 curated themes (including AMOLED Black and Catppuccin), live user CSS editor, custom chat wallpapers, and scalable zoom.
- 🚀 **Productivity Boost**: Direct chat without saving numbers, collapsible sidebar, and native rail integrations.
- 🔒 **Zero Telemetry**: All data remains strictly local in your machine; communication connects directly to official WhatsApp servers.

---

## ✨ Features

### 🛡️ Privacy & Security
- **Granular Privacy Blurs**: Independently blur messages, chat list previews, images/videos, gallery thumbnails, text input, contact names, and profile pictures.
- **Over-the-Shoulder Protection**: Blurred elements automatically reveal themselves upon cursor hover with configurable transitions.
- **Privacy Shield (Idle Veil)**: Locks the screen behind a frosted privacy overlay after a configurable duration of inactivity.
- **Emergency Boss Key (`F12` / `Ctrl+Shift+X`)**: Instantly minimizes/hides all windows, brings up the privacy veil, and mutes any playing audio/video.
- **Native WhatsApp App Lock**: Full compatibility with WhatsApp Web's official passcode lock.

### 🎨 Appearance & Customization
- **8 Built-in Themes**:
  - `System` (auto-sync with OS dark/light mode)
  - `AMOLED Pure Black` (ideal for OLED screens)
  - `Catppuccin Mocha`, `Nord`, `Dracula`, `Tokyo Night`, `Gruvbox Dark`, `Cyberpunk Neon`
- **Stylus Live CSS Editor**: Inject your own CSS rules in real time with built-in presets (custom bubble colors, clean typography, compact sidebar, hidden status tabs).
- **Custom Chat Wallpaper**: Set any image URL as your conversation background with adjustable opacity.
- **Zoom Scaling**: Fine-tune UI zoom between 70% and 150% with smooth range slider and presets.

### 💬 Productivity & Messaging
- **Direct Chat**: Start conversations instantly by entering a phone number without saving it into your contacts. Available from the system tray, settings, and WhatsApp's left rail.
- **Collapsible Chat List**: Collapse the conversation sidebar into a compact 97px avatar strip (Telegram-style) to give full width to your active chat.
- **Injected Nav Rail Buttons**: WhatsPulse Settings and Direct Chat icons live directly inside WhatsApp's native navigation rail for seamless access.

### 🔔 System Integration & Notifications
- **Native Desktop Notifications**: Bypasses browser permission issues by routing HTML5 notifications into native Linux desktop notifications (`notify-rust`).
- **Custom Notification Icon Badges**: Choose between Emoji badges (`💬`, `🟢`, `⚡`, etc.), SVG presets, or your own custom PNG/SVG file.
- **Quiet Hours & DND**: Set automatic quiet hours schedules (e.g. 22:00 - 07:00) and Do Not Disturb toggles.
- **System Tray Integration**:
  - Unread message counter badge.
  - Left-click to toggle window visibility.
  - Clean context menu with direct toggles for DND, Settings, Direct Chat, and Quit.
- **XDG Autostart**: Optional auto-launch on system boot (minimized to tray).

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action | Scope |
|:---|:---|:---|
| <kbd>F12</kbd> or <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>X</kbd> | **Boss Key / Panic Mode** (Instant hide & mute) | Global across app |
| <kbd>Esc</kbd> | Close Settings / Dismiss Direct Chat Dialog | Settings / In-page Dialog |
| <kbd>Ctrl</kbd> + <kbd>+</kbd> / <kbd>-</kbd> | Zoom In / Out | In page |
| <kbd>Ctrl</kbd> + <kbd>0</kbd> | Reset Zoom to 100% | In page |

---

## 📦 Installation

### Ubuntu / Debian (`.deb`)

Download the latest `.deb` package from the [**Releases Page**](https://github.com/brilyyy/whatspulse/releases/latest):

```bash
# Install downloaded package
sudo dpkg -i WhatsPulse_*_amd64.deb

# Resolve any missing dependencies automatically
sudo apt install -f
```

Once installed, launch **WhatsPulse** from your application menu or run:
```bash
whatspulse
```

---

## 🛠️ Development & Building from Source

### 1. System Dependencies (Linux)

#### Debian / Ubuntu / Pop!_OS
```bash
sudo apt update
sudo apt install -y \
  libwebkit2gtk-4.1-dev \
  libgtk-3-dev \
  libsoup-3.0-dev \
  libjavascriptcoregtk-4.1-dev \
  libayatana-appindicator3-dev \
  gstreamer1.0-plugins-good \
  gstreamer1.0-plugins-bad \
  gstreamer1.0-libav \
  build-essential \
  curl \
  wget
```

#### Arch Linux / Manjaro
```bash
sudo pacman -S --needed \
  webkit2gtk-4.1 \
  gtk3 \
  libappindicator-gtk3 \
  base-devel \
  curl \
  wget
```

#### Fedora
```bash
sudo dnf install -y \
  webkit2gtk4.1-devel \
  gtk3-devel \
  libappindicator-gtk3-devel \
  gstreamer1-plugins-good \
  gstreamer1-plugins-bad-free \
  gstreamer1-libav
```

### 2. Setup & Development Server

Ensure you have **Node.js (>= 20)**, **pnpm**, and **Rust (>= 1.77)** installed.

```bash
# Clone the repository
git clone https://github.com/brilyyy/whatspulse.git
cd whatspulse

# Install frontend dependencies
pnpm install

# Run in development mode (hot-reloading enabled)
pnpm tauri dev
```

### 3. Testing & Building

```bash
# Run unit tests (Rust backend & phone parsers)
cargo test --manifest-path src-tauri/Cargo.toml

# Build frontend and compile TypeScript injection bundle
pnpm run build

# Package production installer (.deb & binary)
pnpm tauri build
```

The production output will be located in:
`src-tauri/target/release/bundle/deb/`

---

## 🏗️ Architecture & Codebase

WhatsPulse employs a clean modular architecture:
- **`src/injection/`**: 100% strongly-typed TypeScript injection engine bundled via Vite into a single IIFE (`src-tauri/src/scripts/injection.bundle.js`).
- **`src/`**: Modularized frontend settings app divided into `modules/`, `services/`, and `types/` (<50 lines entry point).
- **`src-tauri/src/commands/`**: Domain-driven Rust command submodules (`settings`, `notification`, `direct_chat`, `window`, `autostart`, `updater`, `client`).

For an in-depth architectural breakdown, sequence diagrams, and design decisions, please read the [**Technical Architecture Documentation (docs/architecture.md)**](docs/architecture.md).

---

## 📜 License & Credits

Distributed under the **MIT License**. See [`LICENSE`](LICENSE) for more information.

- Evolved and inspired by [Whatsie](https://github.com/keshavbhatt/whatsie).
- Privacy blur concepts inspired by [Privacy Extension for WhatsApp Web](https://github.com/aryomuzakki/privacy-whatsapp-web-auto-blur).
- Built with [Tauri v2](https://v2.tauri.app/) and [Rust](https://www.rust-lang.org/).
