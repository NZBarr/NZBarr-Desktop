# Project Identity

- The app name is NZBarr
- Always use the name "NZBarr" consistently
- Do not rename the app unless explicitly asked
- NZBarr is an Electron app for worldwide distribution

# Platform Requirements

- NZBarr must support:
  - macOS (Apple Silicon / ARM)
  - macOS (Intel)
  - Windows
  - Linux
- Always prefer cross-platform solutions
- Avoid OS-specific code unless absolutely necessary
- If OS-specific behavior is required, isolate it clearly

# Development Environment

- Development is done on macOS
- The system is a Mac Studio
- Always ensure compatibility with other platforms

# Core Development Rules

- Keep code simple, readable, and maintainable
- Follow existing project structure and conventions
- Do not introduce unnecessary complexity
- Always explain important decisions briefly

# Electron Architecture Rules

- Strictly separate:
  - Main process (backend/system logic)
  - Renderer process (UI)
- Never mix responsibilities between processes
- Use preload scripts for controlled bridging

# Electron Security Rules (VERY IMPORTANT)

- Enable contextIsolation
- Disable nodeIntegration in renderer
- Use preload scripts instead of exposing Node directly
- Never expose sensitive APIs to the renderer
- Validate and sanitize all IPC communication

# Cross-Platform Rules

- All file paths must use Node.js path utilities
- Do not hardcode OS-specific paths
- Handle OS differences explicitly where needed
- Ensure features behave consistently across all platforms

# Packaging & Distribution

- The app must be easy to install for non-technical users
- Provide installers for:
  - macOS (.dmg or .pkg)
  - Windows (.exe)
  - Linux (AppImage or .deb)
- Prefer Electron-compatible packaging tools (e.g., electron-builder)

# UX Preferences

- Prefer GUI-based solutions over CLI
- Provide visual feedback for long-running actions
- Keep the UI simple and intuitive

# Memory Usage

- Always check memory (mem0) for relevant past context
- Store important long-term decisions when appropriate