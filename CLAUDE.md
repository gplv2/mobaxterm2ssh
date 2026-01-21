# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**mobaxterm2ssh** is a Node.js CLI tool that converts terminal session configurations between MobaxTerm, SuperPutty, and OpenSSH formats. It enables bidirectional migration of saved sessions while preserving folder hierarchies, jump host settings, and authentication options.

## Commands

```bash
# Run all tests
npm test

# Run specific test suites
npm run test:superputty      # SuperPutty parser tests
npm run test:mobaxterm       # MobaxTerm parser tests
npm run test:generator       # SuperPutty generator tests

# CLI usage examples
node mobaconv.js --datadir ./data/                                    # Auto-detect format, output SSH config
node mobaconv.js --datadir ./data/ --format superputty                # Force SuperPutty input format
node mobaconv.js --datadir ./data/ --output-format superputty --outputfile out.xml  # Output to SuperPutty XML
```

No build step required - runs directly with Node.js.

## Architecture

```
Input Files → Parser Registry → Format Parsers → Unified Sessions → Generator Registry → Output
```

### Core Data Flow

1. **Parsers** (`lib/parsers/`) convert format-specific files into unified Session objects
2. **Session model** (`lib/session.js`) defines the common data structure all formats convert to/from
3. **Generators** (`lib/generators/`) convert unified Sessions back to specific output formats

### Key Modules

- **`mobaconv.js`** - CLI entry point, argument parsing, orchestration
- **`lib/session.js`** - Unified session data model with `createSession()` factory and `SessionType` enum
- **`lib/parsers/index.js`** - Parser registry with format auto-detection by file extension
- **`lib/parsers/mobaxterm.js`** - Parses `.ini`/`.mxtsessions` files (32 config fields including jump host settings)
- **`lib/parsers/superputty.js`** - Parses `Sessions.xml`, extracts PuTTY command-line args (`-i`, `-A`, `-X`, `-P`)
- **`lib/generators/sshconfig.js`** - Outputs OpenSSH config format, merges with existing config, creates backups
- **`lib/generators/superputty.js`** - Outputs SuperPutty XML format

### Adding New Formats

To add a new format:
1. Create parser in `lib/parsers/` implementing `canParse(file)` and `parse(file)` returning Session objects
2. Register in `lib/parsers/index.js`
3. Create generator in `lib/generators/` if bidirectional conversion needed
4. Register in `lib/generators/index.js`

## Testing

Tests use Node.js built-in `assert` module with a custom test harness (no external framework). Test files are in `test/` and test individual parser/generator functions.
