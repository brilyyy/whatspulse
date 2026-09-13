# WhatsPulse (Tauri v2 Edition)

> **Modern, lightweight, and blazingly fast WhatsApp Web desktop client built with Rust and Tauri v2.**

---

## ✨ Features

- **Blazingly Fast & Lightweight**: Powered by Tauri v2 and native OS WebViews (~10-15MB app size, ~100MB RAM compared to 500MB+ in Electron/Qt).
- **Desktop System Tray**: Minimize to tray on close, left-click to toggle, unread message count badge, and quick action context menu.
- **Native OS Notifications**: Injected polyfill intercepts WhatsApp Web notifications and surfaces native desktop notification banners with avatars.
- **Argon2id Passcode Lock**: Military-grade passcode protection to keep your private chats safe with auto-lock on launch and idle inactivity.
- **Over-the-shoulder Privacy Blur**: Blur chats and media until you hover with the cursor (configurable blur intensity 1-3).
- **Two-way Theme Synchronization**: WhatsApp Web theme automatically syncs with system appearance or user settings (Light/Dark/System).
- **Injected Nav Rail Button**: Adds a native-feeling WhatsPulse Settings button right inside WhatsApp Web's left navigation rail.
- **Collapsible Chat List**: Collapse the chat sidebar into an avatar strip for focused chatting.
- **Single Instance**: Focuses your existing window when launched again.

---

## 🛠️ Development & Building

### Prerequisites (Linux)
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
  gstreamer1.0-libav
```

### Run in Development
```bash
pnpm install
pnpm tauri dev
```

### Build Production Package
```bash
pnpm tauri build
```
The output binary (`whatspulse`) and `.deb` installer (`WhatsPulse_2.0.1_amd64.deb`) will be located in `src-tauri/target/release/bundle/`. Once installed, you can launch it via terminal using:
```bash
whatspulse
```

---

## 📜 License
MIT License. Inspired by and evolved from [Whatsie](https://github.com/keshavbhatt/whatsie).
