# Security Policy

NZBarr is a hobby open-source project. Security reports are appreciated and will be handled as carefully as possible.

## Supported Versions

The current `main` branch is the supported development version.

Older commits or unofficial forks are not actively supported by this project.

## Reporting A Vulnerability

Please do not open a public GitHub issue for security vulnerabilities.

Report security concerns by email:

```text
info@nzbarr.com
```

Please include:

- A short description of the issue.
- Steps to reproduce it.
- The affected operating system.
- Whether the issue exposes private data, credentials, local files, or remote access.
- Any suggested fix, if you have one.

## Sensitive Data

Do not share real API keys, Usenet credentials, downloader passwords, databases, NZB files, or downloaded media in public issues or pull requests.

If you need to show a configuration example, replace private values with placeholders:

```text
TMDB_API_KEY=your-key-here
SABNZBD_API_KEY=your-key-here
```

## Scope

Security reports are most useful when they affect NZBarr itself, such as:

- Local file access problems.
- Unsafe path handling.
- Credential exposure.
- Insecure IPC behavior.
- Dangerous handling of imported files.
- Accidental logging of secrets.

Issues in third-party services, Usenet providers, downloaders, or media files should be reported to the relevant project or provider.
