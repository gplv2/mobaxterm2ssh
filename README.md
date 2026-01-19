# mobaxterm2ssh

Convert MobaxTerm and SuperPutty session configurations to OpenSSH `~/.ssh/config` format.

## Supported Formats

| Format | File Types | Description |
|--------|------------|-------------|
| MobaxTerm | `.ini`, `.mxtsessions` | Windows terminal emulator session exports |
| SuperPutty | `.xml` (Sessions.xml) | PuTTY session manager exports |

## Features

- Auto-detects input format based on file extension
- Preserves folder hierarchy as comments in SSH config
- Extracts jump host / ProxyJump settings (MobaxTerm)
- Parses PuTTY command-line args from ExtraArgs (SuperPutty)
- Merges with existing SSH config (preserves your current entries)
- Creates timestamped backups before overwriting
- Supports username replacement across all sessions

## Installation

```bash
npm install
```

## Usage

```
Usage: node mobaconv.js [options]

Options:
  --datadir <dir>           Directory with session files (.ini, .mxtsessions, .xml)
                            Defaults to ./data/
  --format <type>           Input format: auto (default), mobaxterm, superputty
                            'auto' detects based on file extensions
  --sshconfigfile <file>    Source SSH config file to merge with
                            Defaults to ~/.ssh/config
  --outputfile <file>       Target SSH config file
                            Defaults to --sshconfigfile value
  --replaceuser <old/new>   Replace a username everywhere (proxy and SSH user)
  --help                    Show help information
```

## Examples

### Convert MobaxTerm sessions
```bash
# Auto-detect format from .ini files in ./data/
node mobaconv.js

# Specify input directory
node mobaconv.js --datadir /path/to/exports/
```

### Convert SuperPutty sessions
```bash
# Auto-detect from .xml files
node mobaconv.js --datadir /path/to/superputty/

# Explicitly specify format
node mobaconv.js --datadir ./sessions/ --format superputty
```

### Write to a different output file
```bash
node mobaconv.js --outputfile ./my-ssh-config
```

### Replace usernames during conversion
```bash
node mobaconv.js --replaceuser olduser/newuser
```

## Input File Locations

### MobaxTerm
- Main config: `%APPDATA%/MobaXterm/MobaXterm.ini`
- Portable: `MobaXterm.ini` next to `MobaXterm.exe`
- Exported: Right-click sessions > "Export sessions to file"

### SuperPutty
- Sessions database: `%USERPROFILE%/Documents/SuperPuTTY/Sessions.xml`
- Or via: File > Export Sessions

## Output Format

The tool generates standard OpenSSH config entries:

```
###  Production/Web Servers
# nginx01
Host 192.168.1.10
  Port 22
  HostName 192.168.1.10
  User admin
  IdentityFile ~/.ssh/id_ed25519
  ForwardAgent yes
```

## Running Tests

```bash
npm test              # Run SuperPutty parser tests
npm run test:all      # Run all tests
npm run test:mobaxterm # Run MobaxTerm parser tests
```

## Format Documentation

See [docs/mxtsessions_format.md](docs/mxtsessions_format.md) for detailed MobaxTerm format documentation.

## Credits

MobaxTerm format decoding based on research by [Ruzgfpegk](https://gist.github.com/Ruzgfpegk/ab597838e4abbe8de30d7224afd062ea).

## License

MIT
