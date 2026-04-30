# Contributing

Thank you for wanting to help with NZBarr.

NZBarr is a hobby project, not a commercial software product. Contributions are welcome, but please keep changes practical, focused, and respectful of the project's goals.

## Good Ways To Help

- Report bugs with clear steps to reproduce.
- Improve documentation.
- Test NZBarr on macOS, Windows, or Linux.
- Suggest small usability improvements.
- Fix focused bugs.
- Improve import, matching, or downloader behavior.

## Before Opening A Pull Request

Please:

1. Open an issue first for large changes.
2. Keep pull requests focused on one topic.
3. Avoid unrelated formatting or refactoring.
4. Do not commit private data, API keys, databases, NZB files, or downloaded media.
5. Test the app from source before submitting.

## Running From Source

Install dependencies:

```bash
npm install
```

Start NZBarr:

```bash
npm start
```

This source checkout uses the `NZBarr-GIT` app variant and keeps its app data separate from a normal NZBarr install.

## Documentation

If your change affects setup or user behavior, update the relevant documentation in `docs/`.

Useful starting points:

- [Getting Started](docs/getting-started.md)
- [Settings Guide](docs/settings.md)
- [Troubleshooting](docs/troubleshooting.md)

## Code Style

The project is plain Electron, Node.js, HTML, CSS, and JavaScript. Please follow the existing style in the file you are editing.

Keep changes simple where possible. NZBarr should remain understandable for hobby programmers and users who want to learn from the code.

## Pull Request Review

Pull requests may take time to review. This is a hobby project, so review and response times depend on available free time.
