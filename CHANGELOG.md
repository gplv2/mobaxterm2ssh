# Changelog

All notable changes to mobaxterm2ssh.

## [2.1.0] - 2026-01-19

### New Features

- **Export to SuperPutty XML**: Convert your sessions back to SuperPutty format with the new `--output-format superputty` option. Perfect for sharing configs with team members who use SuperPutty.

- **Bidirectional Conversion**: Now supports full round-trip conversion between all formats - MobaxTerm, SuperPutty, and OpenSSH config.

### Improvements

- Folder hierarchy is preserved when exporting to SuperPutty XML
- PuTTY command-line arguments (`-A`, `-X`, `-i`) are automatically generated from session settings

## [2.0.0] - 2026-01-19

### New Features

- **SuperPutty Support**: Import sessions from SuperPutty's `Sessions.xml` files. Automatically extracts PuTTY command-line arguments including identity files, agent forwarding, and X11 forwarding.

- **Auto-Detection**: The tool now automatically detects whether your input files are MobaxTerm or SuperPutty format. No need to specify `--format` unless you want to override.

- **Format Selection**: New `--format` option to explicitly choose the input format when needed.

### Improvements

- Reorganized codebase into modular architecture (`lib/parsers/`, `lib/generators/`)
- Added comprehensive test suite for both parsers

## [1.0.0] - Initial Release

### Features

- **MobaxTerm to SSH Config**: Convert MobaxTerm `.ini` and `.mxtsessions` files to standard OpenSSH `~/.ssh/config` format

- **Jump Host Support**: Automatically converts MobaxTerm's SSH gateway settings to ProxyJump configuration

- **Session Preservation**: Maintains folder organization, usernames, ports, identity files, and connection options (agent forwarding, X11, compression)

- **Safe Merging**: Merges converted sessions with your existing SSH config file, creating timestamped backups before any modifications

- **Username Replacement**: Use `--replaceuser old/new` to update usernames across all sessions during conversion
