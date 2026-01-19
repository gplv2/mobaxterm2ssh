# mobaxterm2ssh

Convert session configurations between MobaxTerm, SuperPutty, and OpenSSH formats.

## Supported Formats

### Input Formats
| Format | File Types | Description |
|--------|------------|-------------|
| MobaxTerm | `.ini`, `.mxtsessions` | Windows terminal emulator session exports |
| SuperPutty | `.xml` (Sessions.xml) | PuTTY session manager exports |

### Output Formats
| Format | Description |
|--------|-------------|
| sshconfig | OpenSSH `~/.ssh/config` format |
| superputty | SuperPutty `Sessions.xml` format |

## Features

- Auto-detects input format based on file extension
- Bidirectional conversion between formats
- Preserves folder hierarchy
- Extracts jump host / ProxyJump settings (MobaxTerm)
- Parses PuTTY command-line args (SuperPutty)
- Merges with existing SSH config
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
  --output-format <type>    Output format: sshconfig (default), superputty
  --sshconfigfile <file>    Source SSH config file to merge with (sshconfig output only)
                            Defaults to ~/.ssh/config
  --outputfile <file>       Target output file
                            Defaults to ~/.ssh/config (sshconfig) or Sessions.xml (superputty)
  --replaceuser <old/new>   Replace a username everywhere (proxy and SSH user)
  --help                    Show help information
```

## Examples

### MobaxTerm to SSH config (default)
```bash
node mobaconv.js --datadir ./sessions/
```

### MobaxTerm to SuperPutty
```bash
node mobaconv.js --datadir ./data/ --output-format superputty --outputfile Sessions.xml
```

### SuperPutty to SSH config
```bash
node mobaconv.js --datadir ./data/ --format superputty
```

### SuperPutty to MobaxTerm (via SuperPutty output)
```bash
# First convert SuperPutty to another SuperPutty file (for reorganization)
node mobaconv.js --datadir ./old-sessions/ --output-format superputty --outputfile new-sessions.xml
```

### With username replacement
```bash
node mobaconv.js --datadir ./data/ --replaceuser olduser/newuser
```

## Input File Locations

### MobaxTerm
- Main config: `%APPDATA%/MobaXterm/MobaXterm.ini`
- Portable: `MobaXterm.ini` next to `MobaXterm.exe`
- Exported: Right-click sessions > "Export sessions to file"

### SuperPutty
- Sessions database: `%USERPROFILE%/Documents/SuperPuTTY/Sessions.xml`
- Or via: File > Export Sessions

## Output Examples

### SSH Config Output
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

### SuperPutty XML Output
```xml
<?xml version="1.0" encoding="utf-8"?>
<ArrayOfSessionData>
  <SessionData SessionId="Production/Web Servers/nginx01" SessionName="nginx01"
               Host="192.168.1.10" Port="22" Proto="SSH" Username="admin"
               PuttySession="Default Settings" ExtraArgs="-A" Note="" />
</ArrayOfSessionData>
```

## Running Tests

```bash
npm test                  # Run all tests
npm run test:superputty   # Run SuperPutty parser tests
npm run test:mobaxterm    # Run MobaxTerm parser tests
npm run test:generator    # Run SuperPutty generator tests
```

## Format Documentation

See [docs/mxtsessions_format.md](docs/mxtsessions_format.md) for detailed MobaxTerm format documentation.

## Credits

MobaxTerm format decoding based on research by [Ruzgfpegk](https://gist.github.com/Ruzgfpegk/ab597838e4abbe8de30d7224afd062ea).

## License

MIT
