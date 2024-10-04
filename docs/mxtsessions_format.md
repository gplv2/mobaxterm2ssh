# .mxtsessions file format

## Introduction

This document tries to give a description of the .mxtsession files used in the proprietary software MobaXterm.
Sadly this format, as efficient as it is, is too obscure to encourage legitimate use cases of this format as there is no public documentation available.

The software licence of MobaXterm, for both Home and Pro editions, allows to *"observe, study or test the functioning of the Software in order to determine the ideas and principles which are the basis of the Software, when performing the loading, display, execution, transmission or storage of the Software"* and this study has been done in full under those terms.

The studied format is the one of version 23.6: sessions last modified (but not necessarily exported) before this version will have fewer fields.

## Projects

If your project uses the information shared here feel free to talk about it in the comments, and I'll add it to the list.

PHP Libraries:
 - [Sessionator, by myself](https://github.com/Ruzgfpegk/sessionator/) allows to compose session files from PHP by building connection objects and exporting them all at once to different formats (MobaXterm being the first one).
   This library is used by a relatively large hosting company in Europe to reduce the time needed to connect to their thousands of managed servers (many of them having their own specific "connection pathways").

Utilities:
- [mobaConverterGo, by dbauer23](https://github.com/dbauer23/mobaConverterGo) converts .mxtsessions files to JSON and vice-versa, which is useful for some [jq manipulation magic](https://jqlang.github.io/jq/tutorial/).

## Overall format

.mxtsessions files follow the INI format, using a Windows-1252/CP1252 charset and Windows (CR LF) line delimiters: it can be tested by using the "Euro" € character in a session title.
Which means that Unicode characters can't be used anywhere, especially in session names and comments, and will need to be transformed if present in some source data.

They're basically an extract of all "Bookmarks" sections from the "main" %APPDATA%/MobaXterm/MobaXterm.ini configuration file (or the MobaXterm.ini file next to MobaXterm.exe if you run a Portable version).

Their content is roughly the same whether they are :

* a full export (right-click on "User sessions" and click "Export all sessions to file"),
* a partial export (right-click on a session folder and click "Export sessions from this folder"),
* a "Shared" export (right-click on a session folder or at the root folder and click "Share these sessions with my team").

### Folders

A full or "fully shared" export starts with:

```ini
[Bookmarks]
SubRep=
ImgNum=42
```

Being the main folder, SubRep ("sub-repertory") is empty (the name is forced to "User sessions" by the software) and ImgNum is 42 (icon of a folder with a person above it): this icon cannot be changed in the software.
Following those two properties are the sessions saved under the folder, one per line (see section below).

A partial or "partially shared" export starts with:

```ini
[Bookmarks]
SubRep=The folder selected for export
ImgNum=41
```

Here ImgNum will be whatever it was set to prior to the export, but SubRep will be the name of the "root partial folder".

Sub-folders follow this naming convention:

```ini
[Bookmarks_1]
SubRep=Subfolder name
ImgNum=41
```

In this case, "SubRep" needs to be filled with the directory name that would be displayed on-screen.
The default ImgNum is the empty blue folder (icon ID 41).

The number after "Bookmarks_" indicates the placement order on-screen, from top to bottom.

Sub-sub-folders have a "SubRep" property like "Folder1\\Folder2", with as many sub-folders as necessary.

#### Annotated list of folder icons

The icons in the following screenshot are the property of MOBATEK SARL.

![MobaXterm-folder-icons-annotated](https://user-images.githubusercontent.com/3818364/211368734-b39b9f1d-fc5f-4084-8f81-86d7b23dcec6.png)

### Sessions

Session lines looks like this:

```ini
Reference Session= #109#0%localhost%22%<default>%%-1%-1%%%%%0%0%0%%%-1%0%0%0%%1080%%0%0%1%%0%%%%0%-1%-1%0#MobaFont%10%0%0%-1%15%236,236,236%30,30,30%180,180,192%0%-1%0%%xterm%-1%0%_Std_Colors_0_%80%24%0%0%-1%<none>%%0%0%-1%-1#0# #-1
Deck=#109#0%192.168.137.40%22%deck%%0%0%%%%%0%0%0%%%-1%0%0%0%%1080%%0%0%1%#MobaFont%10%0%0%-1%15%236,236,236%30,30,30%180,180,192%0%-1%0%%xterm%-1%0%_Std_Colors_0_%80%24%0%1%-1%<none>%%0%0%-1%-1#0# #-1
```

If you export a session (Right click -> "Save session to file") you'll get a .moba file containing only one session line.

The value is the session name, and can contain spaces.

The property is an ordered list, separated by the '#' character, of session characteristics, and some of them can contain a second dimension of characteristics separated by the '%' character.
The number of session characteristics in a line or parent characteristic depend on the version under which the session was last saved: it is assumed that new versions of the software add new characteristic indexes while some older ones (among the unidentified ones) may become ignored.

#### SSH Session lines

By comparing sessions with a changed parameter against a reference session, the full list has been identified as:

1. "`;  logout`" if "Display reconnection message" is unchecked in "Bookmark settings", empty if it's checked.

2. The icon number of the session (see list below) (the default for SSH is 109)

3. The first group of session characteristics, separated by the '%' character (quotes indicate literal strings or numbers):

   | Index | SSH Property                                                   | Default Value                                     | Section                                                     | Note                                                                                                                                                                                                                                                                         |
   |-------|----------------------------------------------------------------|---------------------------------------------------|-------------------------------------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
   | 0     | Session type                                                   | 0                                                 |                                                             | For SSH connections it's always "0". Other session types have other identifiers.                                                                                                                                                                                             |
   | 1     | Remote host                                                    |                                                   | Basic SSH settings                                          | Cannot be empty                                                                                                                                                                                                                                                              |
   | 2     | Port                                                           | 22                                                | Basic SSH settings                                          | (self-explanatory)                                                                                                                                                                                                                                                           |
   | 3     | Username (specific or "<default>")                             | (empty)                                           | Basic SSH settings                                          | The default login is set in-app and its default is the Windows login                                                                                                                                                                                                         |
   | 4     | ?                                                              | (empty)                                           |                                                             | Seems always empty for SSH.                                                                                                                                                                                                                                                  |
   | 5     | X11-Forwarding                                                 | -1                                                | Advanced SSH settings                                       | enabled "-1", disabled "0"                                                                                                                                                                                                                                                   |
   | 6     | Compression                                                    | -1                                                | Advanced SSH settings                                       | enabled "-1", disabled "0"                                                                                                                                                                                                                                                   |
   | 7     | Execute command (at login)                                     | (empty)                                           | Advanced SSH settings                                       | '`;`' in the text field is changed to "`__PTVIRG__`" in the setting                                                                                                                                                                                                          |
   | 8     | SSH Gateway host list                                          | (empty)                                           | Network settings                                            | If one gateway, its hostname. If multiple, their hostnames separated by "`__PIPE__`".                                                                                                                                                                                        |
   | 9     | SSH Gateway port list                                          | (empty)                                           | Network settings                                            | If one gateway, its port. If multiple, their ports separated by "`__PIPE__`" (ex. `22__PIPE__22`).                                                                                                                                                                           |
   | 10    | SSH Gateway user list                                          | (empty)                                           | Network settings                                            | If one gateway, its username. If multiple, their usernames separated by "`__PIPE__`" (ex. `userHost1__PIPE__userHost2`).                                                                                                                                                     |
   | 11    | Do not exit after (login) command ends                         | 0                                                 | Advanced SSH settings                                       | enabled "-1", disabled "0"                                                                                                                                                                                                                                                   |
   | 12    | Don't specify username                                         | 0 if index 3 (username) is filled, -1 if it's not |                                                             | enabled "-1", disabled "0" (specific username used)                                                                                                                                                                                                                          |
   | 13    | Remote environment                                             | 0                                                 | Advanced SSH settings                                       | Interactive shell "0", LXDE "1", ... (long list of DEs) (TODO complete the list)                                                                                                                                                                                             |
   | 14    | Private key path, if set                                       | (empty)                                           | Advanced SSH settings                                       | 'C' drive letter in the path is changed to "`_CurrentDrive_`" in the setting                                                                                                                                                                                                 |
   | 15    | SSH Gateway private key list                                   | (empty) if 0 or 1 gateway, `__PIPE__` if two, …   | Network settings                                            | If one gateway, its private key (optional). If multiple, their private keys (optional) separated by "`__PIPE__`" (ex. `pathKeyHost1__PIPE__pathKeyHost2`). Two separators can follow each other if a key is absent. Same 'C' drive letter replacement as above.              |
   | 16    | SSH-browser type (File browser)                                | -1                                                | Advanced SSH settings (auto from 24/25)                     | enabled "-1", disabled "0"                                                                                                                                                                                                                                                   |
   | 17    | Follow SSH path (experimental) (in File browser)               | 0                                                 | Advanced SSH settings                                       | enabled "-1", disabled "0"                                                                                                                                                                                                                                                   |
   | 18    | ?                                                              | 0                                                 |                                                             |                                                                                                                                                                                                                                                                              |
   | 19    | Proxy type                                                     | 0                                                 | Network settings                                            | None "0", Socks4 "1", Socks5 "2", Http "3", Telnet "4", Local "5"                                                                                                                                                                                                            |
   | 20    | Proxy host                                                     | (empty)                                           | Network settings                                            | (self-explanatory)                                                                                                                                                                                                                                                           |
   | 21    | Proxy port                                                     | 1080                                              | Network settings                                            | (the default is set even if the Proxy type is "None")                                                                                                                                                                                                                        |
   | 22    | Proxy login                                                    | (empty)                                           | Network settings                                            | (self-explanatory)                                                                                                                                                                                                                                                           |
   | 23    | Adapt locales on remote server                                 | 0                                                 | Expert SSH settings                                         | enabled "-1" ("try to send the local language settings to the server"), disabled "0"                                                                                                                                                                                         |
   | 24    | File Browser: SCP over SFTP                                    | 0                                                 | Advanced SSH settings (set from selection choices)          | enabled (SCP) "-1", disabled (SSH or None) "0"                                                                                                                                                                                                                               |
   | 25    | File Browser Protocol                                          | 1                                                 | Advanced SSH settings (set from selection choices)          | disabled "0", SFTP "1", SCP Speed "2", SCP Normal "3"                                                                                                                                                                                                                        |
   | 26    | Local proxy command                                            | (empty)                                           | Network settings (only when Proxy type "Local" is selected) | If index 19 is "5", the local proxy command (recognizes the internal variables `%host`, `%port`, `%user`, `%pass`, and uses `%%` for a literal percentage, of course the '%' character is changed to `__PERCENT__` in the session line to avoid clashing with the separator) |
   |       |                                                                |                                                   |                                                             | -- The fields below were not in sessions I saved before v22.3, but maybe they were only added after going to the "Expert SSH settings" section --                                                                                                                            |
   | 27    | SSH protocol version                                           | 0                                                 | Expert SSH settings                                         | auto "0", SSHv2 "1", SSHv1 (insecure) "2"                                                                                                                                                                                                                                    |
   | 28    | Key Exchange algorithms                                        | (empty)                                           | Expert SSH settings                                         | Default equals to: ecdh,dh-gex-sha1,dh-group14-sha1,rsa,WARN,dh-group1-sha1                                                                                                                                                                                                  |
   | 29    | Host key types                                                 | (empty)                                           | Expert SSH settings                                         | Default equals to: ed448,ed25519,ecdsa,rsa,WARN,dsa                                                                                                                                                                                                                          |
   | 30    | Ciphers                                                        | (empty)                                           | Expert SSH settings                                         | Default equals to: aes,chacha20,3des,WARN,des,blowfish,arcfour                                                                                                                                                                                                               |
   | 31    | Disconnect if authentication succeeds trivially                | 0                                                 | Expert SSH settings                                         | enabled "-1" (disconnects if the connection could be done without password or token), disabled "0"                                                                                                                                                                           |
   | 32    | Prefer hostkey algorithms for which a hostkey is already known | -1                                                | Expert SSH settings                                         | enabled "-1" (adjust the preference order so that known host keys from this server are moved to the top of the list), disabled "0"                                                                                                                                           |
   | 33    | Attempt authentication using the SSH agent                     | -1                                                | Expert SSH settings                                         | enabled "-1" (internal agent or external PuTTY agent, set in global settings), disabled "0"                                                                                                                                                                                  |
   | 34    | Allow agent forwarding                                         | 0                                                 | Expert SSH settings                                         | enabled "-1" (open forwarded connections back to your local agent), disabled "0"                                                                                                                                                                                             |

4. The second group of session characteristics, separated by the '%' character ("Terminal settings" section):

   | Index | SSH Property                             | Default Value    | Note                                                                                                                                                                                     |
   |-------|------------------------------------------|------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
   | 0     | Terminal font                            | MobaFont         | Any installed font + the builtin "MobaFont"                                                                                                                                              |
   | 1     | Font size                                | 10               |                                                                                                                                                                                          |
   | 2     | Terminal font Bold                       | 0                | enabled "-1", disabled "0"                                                                                                                                                               |
   | 3     | ?                                        | 0                |                                                                                                                                                                                          |
   | 4     | Append Windows PATH to shell env         | -1               | enabled "-1", disabled "0"                                                                                                                                                               |
   | 5     | Terminal charset                         | 15               | ISO-8859-1 "0", ISO-8859-15 "13", UTF-8 "15", CP850 "22", Font encoding "40" (too many other settings to list here)                                                                      |
   | 6     | Foreground (standard text) if not global | 236,236,236      | R,G,B (default given for "Dark background / Light text")                                                                                                                                 |
   | 7     | Background color if not global           | 30,30,30         | R,G,B (default given for "Dark background / Light text")                                                                                                                                 |
   | 8     | Cursor color if not global               | 180,180,192      | R,G,B (default given for "Dark background / Light text")                                                                                                                                 |
   | 9     | Cursor type                              | 0                | Block "0", Underline "1", Line "2", Blinking block "3", Blinking underline "4", Blinking line "5"                                                                                        |
   | 10    | Backspace sends ^H                       | -1               | enabled "-1", disabled "0" (sends ^? instead)                                                                                                                                            |
   | 11    | Log output                               | 0                | enabled "-1", disabled "0"                                                                                                                                                               |
   | 12    | Log folder path                          | (empty)          | `<>` for the executable path (ex: portable app), path otherwise ('C' drive replacement as usual)                                                                                         |
   | 13    | Terminal type                            | xterm            | List in v22.3: xterm, xterm-r6, vt100, vt100+, vt220, vt400, vt900, OpenVMS, OpenVMS2, Netterm100, Netterm220, ShiftFnKeys, ESC[n~, SCO, Byobu, xterm-256color                           |
   | 14    | Lock terminal title                      | -1               | enabled "-1", disabled "0" (allows the shell to change the tab title)                                                                                                                    |
   | 15    | ?                                        | 0                |                                                                                                                                                                                          |
   | 16    | Colors scheme                            | `_Std_Colors_0_` | Default is for "Current global color theme" (safer choice). Any other choice changes the number of fields by turning index 16 into 16 colors also separated by '%'.                      |
   | 17    | Terminal rows                            | 80               | (applicable if force fixed)                                                                                                                                                              |
   | 18    | Terminal columns                         | 24               | (applicable if force fixed)                                                                                                                                                              |
   | 19    | Force fixed rows/columns                 | 0                | enabled "-1", disabled "0"                                                                                                                                                               |
   | 20    | Syntax highlighting                      | 1                | None "0", Standard keywords "1", Unix shell script "2", Cisco "3", Perl "4", SQL "5", Custom 1 "101", ... (all custom settings refer to local settings done outside of the session file) |
   | 21    | Show bold font as brighter color         | -1               | enabled "-1", disabled "0"                                                                                                                                                               |
   | 22    | Custom macro type                        | `<none>`         | "`<none>`" or "`<custom macro>`"                                                                                                                                                         |
   | 23    | Custom macro text                        | (empty)          | each text starts with "12:2:0:" and ends with "`__PIPE__`" (currently buggy, they get concatenated in v22.3)                                                                             |
   | 24    | Paste delay                              | 0                | Auto "0", none "1", 10ms "2", 20ms "3", 30ms "4", 40ms "5", 50ms "6", 60ms "7", 70ms "8", 80ms "9", 90ms "10", 100ms "11", 200ms "12", 360ms "13"                                        |
   | 25    | Font Charset                             | 1                | ANSI "0", DEFAULT "1" (valeur système), ARABIC "178", GREEK "161", TURKISH "162", VIETNAMESE "163", EASTEUROPE "238", RUSSIAN "204", BALTIC "186"                                        |
   | 26    | Font Antialiasing                        | -1               | enabled "-1", disabled "0"                                                                                                                                                               |
   | 27    | Font Ligatures                           | -1               | enabled "-1", disabled "0"                                                                                                                                                               |

5. Start session in: "0" for "Normal tab" (default), "1" for "Detached tab", "2" for "Maximized detached tab", "3" for "Fullscreen".

6. The "Comments" field: empty if empty (default), else the comment with any '#' changed to "`__DIEZE__`", no `%` is allowed in the field.

7. Custom tab color: "-1" if unchecked (default), if checked the decimal value of the RGB color ("536870911" for the default color (whitish), "0" for black, "255" for pure red, "65280" for pure green, "16711680" for pure blue)

#### RDP Session lines

By comparing sessions with a changed parameter against a reference session, the full list has been identified as:

1. "`;  logout`" if "Display reconnection message" is unchecked in "Bookmark settings", empty if it's checked.

2. The icon number of the session (see list below) (the default for RDP is 91)

3. The first group of session characteristics, separated by the '%' character (quotes indicate literal strings or numbers):

   | Index | RDP Property                 | Default Value                                   | Section             | Note                                                                                                                                                                                                                                                                                                                                                                                                                           |
   |-------|------------------------------|-------------------------------------------------|---------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
   | 0     | Session type                 | 4                                               |                     | For RDP connections it's always "4".                                                                                                                                                                                                                                                                                                                                                                                           |
   | 1     | Remote host                  | localhost                                       | Basic Rdp settings  | Cannot be empty                                                                                                                                                                                                                                                                                                                                                                                                                |
   | 2     | Port                         | 3389                                            | Basic Rdp settings  | (self-explanatory)                                                                                                                                                                                                                                                                                                                                                                                                             |
   | 3     | Username (specific)          | (empty)                                         | Basic Rdp settings  | The default login is set in-app and its default is the Windows login                                                                                                                                                                                                                                                                                                                                                           |
   | 4     | Admin console                | 0                                               | Connection settings | enabled "-1", disabled "0"                                                                                                                                                                                                                                                                                                                                                                                                     |
   | 5     | Redirect ports               | 0                                               | Local resources     | enabled "-1", disabled "0"                                                                                                                                                                                                                                                                                                                                                                                                     |
   | 6     | Redirect drives              | 0                                               | Local resources     | enabled "-1", disabled "0"                                                                                                                                                                                                                                                                                                                                                                                                     |
   | 7     | Redirect printers            | 0                                               | Local resources     | enabled "-1", disabled "0"                                                                                                                                                                                                                                                                                                                                                                                                     |
   | 8     | ?                            | -1                                              |                     |                                                                                                                                                                                                                                                                                                                                                                                                                                |
   | 9     | Enhanced graphics            | 0                                               | Display settings    | enabled "-1", disabled "0"                                                                                                                                                                                                                                                                                                                                                                                                     |
   | 10    | Resolution                   | 0                                               | Display settings    | Fit to terminal "0", Fit to screen "1", 640x480 "2", 800x600 "3", 1024x768 "4", 1152x864 "5", 1280x720 "6", 1280x968 "7", 1280x1024 "8", 1400x1050 "9", 1600x1200 "10", 1920x1080 "11", 1276x936 "12", 1916x988 "13", 1920x1200 "14", 1280x800 "15", 1360x768 "16", 1366x768 "17", 1440x900 "18", 1536x864 "19", 1600x900 "20", 1680x1050 "21", 2048x1152 "22", 2560x1080 "23", 2560x1440 "24", 3440x1440 "25", 3840x2160 "26" |
   | 11    | ?                            | -1                                              |                     |                                                                                                                                                                                                                                                                                                                                                                                                                                |
   | 12    | Remote command               | (empty)                                         | Connection settings |                                                                                                                                                                                                                                                                                                                                                                                                                                |
   | 13    | SSH Gateway host list        | (empty)                                         | Network settings    | If one gateway, its hostname. If multiple, their hostnames separated by "`__PIPE__`".                                                                                                                                                                                                                                                                                                                                          |
   | 14    | SSH Gateway port list        | (empty)                                         | Network settings    | If one gateway, its port. If multiple, their ports separated by "`__PIPE__`" (ex. `22__PIPE__22`).                                                                                                                                                                                                                                                                                                                             |
   | 15    | SSH Gateway user list        | (empty)                                         | Network settings    | If one gateway, its username. If multiple, their usernames separated by "`__PIPE__`" (ex. `userHost1__PIPE__userHost2`).                                                                                                                                                                                                                                                                                                       |
   | 16    | Redirect audio               | 0                                               | Local resources     | No audio "0", Redirect audio "1", Play on remote server "2"                                                                                                                                                                                                                                                                                                                                                                    |
   | 17    | Native authentication        | 0                                               | Connection settings | enabled "-1", disabled "0"                                                                                                                                                                                                                                                                                                                                                                                                     |
   | 18    | SSH Gateway private key list | (empty) if 0 or 1 gateway, `__PIPE__` if two, … | Network settings    | If one gateway, its private key (optional). If multiple, their private keys (optional) separated by "`__PIPE__`" (ex. `pathKeyHost1__PIPE__pathKeyHost2`). Two separators can follow each other if a key is absent. 'C' drive letter in the path is changed to "`_CurrentDrive_`" in the setting.                                                                                                                              |
   | 19    | Redirect clipboard           | -1                                              | Local resources     | enabled "-1", disabled "0"                                                                                                                                                                                                                                                                                                                                                                                                     |
   | 20    | RDP Gateway                  | (empty)                                         | Connection settings | Gateway hostname                                                                                                                                                                                                                                                                                                                                                                                                               |
   | 21    | Forward keyboard shortcuts   | -1                                              | Connection settings | enabled "-1", disabled "0"                                                                                                                                                                                                                                                                                                                                                                                                     |
   | 22    | Display settings bar         | -1                                              | Display settings    | enabled "-1", disabled "0"                                                                                                                                                                                                                                                                                                                                                                                                     |
   | 23    | ?                            | 0                                               |                     |                                                                                                                                                                                                                                                                                                                                                                                                                                |
   | 24    | Use CredSSP                  | -1                                              | Connection settings | enabled "-1", disabled "0"                                                                                                                                                                                                                                                                                                                                                                                                     |
   | 25    | Redirect microphone          | 0                                               | Local resources     | enabled "-1", disabled "0"                                                                                                                                                                                                                                                                                                                                                                                                     |
   | 26    | Autoscale                    | -1                                              | Display settings    | enabled "-1", disabled "0"                                                                                                                                                                                                                                                                                                                                                                                                     |
   | 27    | Zoom                         | 0                                               | Display settings    | no "0", auto "1", 25% "2", 50% "3", 75% "4", 100% "5", 125% "6", 150% "7", 175% "8", 200% "9", 250% "10", 300% "11", 360% "12"                                                                                                                                                                                                                                                                                                 |
   | 28    | Color depth                  | 0                                               | Display settings    | auto "0", 8 bits "1", 16 bits "2", 24 bits "3", 32 bits "4"                                                                                                                                                                                                                                                                                                                                                                    |
   | 29    | Redirect smartcards          | 0                                               | Local resources     | enabled "-1", disabled "0"                                                                                                                                                                                                                                                                                                                                                                                                     |
   | 30    | Server authentication        | 0                                               | Connection settings | none "0", force "1", prompt "2"                                                                                                                                                                                                                                                                                                                                                                                                |

4. The second group of session characteristics, separated by the '%' character, is identical to the SSH one but only the "Lock terminal title" (index 14) is used in RDP:

   | Index | SSH Property  | Default Value | Note                                        |
   |-------|---------------|---------------|---------------------------------------------|
   | 0     | Terminal font | MobaFont      | Any installed font + the builtin "MobaFont" |
   | ...   |               |               |                                             |

5. Start session in: "0" for "Normal tab" (default), "1" for "Detached tab", "2" for "Maximized detached tab", "3" for "Fullscreen".

6. The "Comments" field: empty if empty (default), else the comment with any '#' changed to "`__DIEZE__`", no `%` is allowed in the field.

7. Custom tab color: "-1" if unchecked (default), if checked the decimal value of the RGB color ("536870911" for the default color (whitish), "0" for black, "255" for pure red, "65280" for pure green, "16711680" for pure blue)

#### VNC Session lines

By comparing sessions with a changed parameter against a reference session, the full list has been identified as:

1. "`;  logout`" if "Display reconnection message" is unchecked in "Bookmark settings", empty if it's checked.

2. The icon number of the session (see list below) (the default for VNC is 128)

3. The first group of session characteristics, separated by the '%' character (quotes indicate literal strings or numbers):

   | Index | RDP Property                                                   | Default Value                                   | Section               | Note                                                                                                                                                                                                                                                                                              |
   |-------|----------------------------------------------------------------|-------------------------------------------------|-----------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
   | 0     | Session type                                                   | 5                                               |                       | For VNC connections it's always "5".                                                                                                                                                                                                                                                              |
   | 1     | Remote hostname or IP address                                  | localhost                                       | Basic Vnc settings    | Cannot be empty                                                                                                                                                                                                                                                                                   |
   | 2     | Port                                                           | 5900                                            | Basic Vnc settings    | (self-explanatory)                                                                                                                                                                                                                                                                                |
   | 3     | Auto scale display to fit the terminal size without scrollbars | -1                                              | Advanced Vnc settings | enabled "-1", disabled "0"                                                                                                                                                                                                                                                                        |
   | 4     | View only                                                      | 0                                               | Advanced Vnc settings | enabled "-1", disabled "0"                                                                                                                                                                                                                                                                        |
   | 5     | SSH Gateway host list                                          | (empty)                                         | Network settings      | If one gateway, its hostname. If multiple, their hostnames separated by "`__PIPE__`".                                                                                                                                                                                                             |
   | 6     | SSH Gateway port list                                          | (empty)                                         | Network settings      | If one gateway, its port. If multiple, their ports separated by "`__PIPE__`" (ex. `22__PIPE__22`).                                                                                                                                                                                                |
   | 7     | SSH Gateway user list                                          | (empty)                                         | Network settings      | If one gateway, its username. If multiple, their usernames separated by "`__PIPE__`" (ex. `userHost1__PIPE__userHost2`).                                                                                                                                                                          |
   | 8     | SSH Gateway private key list                                   | (empty) if 0 or 1 gateway, `__PIPE__` if two, … | Network settings      | If one gateway, its private key (optional). If multiple, their private keys (optional) separated by "`__PIPE__`" (ex. `pathKeyHost1__PIPE__pathKeyHost2`). Two separators can follow each other if a key is absent. 'C' drive letter in the path is changed to "`_CurrentDrive_`" in the setting. |
   | 9     | Display VNC settings bar                                       | -1                                              | Advanced Vnc settings | enabled "-1", disabled "0"                                                                                                                                                                                                                                                                        |
   | 10    | Use new embedded VNC engine                                    | 0                                               | Advanced Vnc settings | enabled "-1", disabled "0"                                                                                                                                                                                                                                                                        |
   | 11    | Use SSL tunneling to secure the connection                     | 0                                               | Advanced Vnc settings | enabled "-1", disabled "0". If enabled, also enables "new embedded VNC engine" on index 10.                                                                                                                                                                                                       |
   | 12    | Use Unix login                                                 | (empty)                                         | Advanced Vnc settings |                                                                                                                                                                                                                                                                                                   |
   | 13    | Proxy type                                                     | 0                                               | Network settings      | None "0", Socks4 "1", Socks5 "2", Http "3", Telnet "4", Local "5" (setting a proxy also enables "new embedded VNC engine" on index 10)                                                                                                                                                            |
   | 14    | Proxy host                                                     | (empty)                                         | Network settings      | (self-explanatory)                                                                                                                                                                                                                                                                                |
   | 15    | Proxy port                                                     | 1080                                            | Network settings      | (the default is set even if the Proxy type is "None")                                                                                                                                                                                                                                             |
   | 16    | Proxy login                                                    | (empty)                                         | Network settings      | (self-explanatory)                                                                                                                                                                                                                                                                                |
   | 17    | ?                                                              | (empty)                                         |                       |                                                                                                                                                                                                                                                                                                   |

4. The second group of session characteristics, separated by the '%' character, is identical to the SSH one but only the "Lock terminal title" (index 14) is used in VNC:

   | Index | SSH Property  | Default Value | Note                                        |
   |-------|---------------|---------------|---------------------------------------------|
   | 0     | Terminal font | MobaFont      | Any installed font + the builtin "MobaFont" |
   | ...   |               |               |                                             |

5. Start session in: "0" for "Normal tab" (default), "1" for "Detached tab", "2" for "Maximized detached tab", "3" for "Fullscreen".

6. The "Comments" field: empty if empty (default), else the comment with any '#' changed to "`__DIEZE__`", no `%` is allowed in the field.

7. Custom tab color: "-1" if unchecked (default), if checked the decimal value of the RGB color ("536870911" for the default color (whitish), "0" for black, "255" for pure red, "65280" for pure green, "16711680" for pure blue)

#### SFTP Session lines

By comparing sessions with a changed parameter against a reference session, the full list has been identified as:

1. "`;  logout`" if "Display reconnection message" is unchecked in "Bookmark settings", empty if it's checked.

2. The icon number of the session (see list below) (the default for SFTP is 140)

3. The first group of session characteristics, separated by the '%' character (quotes indicate literal strings or numbers):

   | Index | RDP Property                  | Default Value | Section                        | Note                                                                                                                                                                                                                                                                   |
   |-------|-------------------------------|---------------|--------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
   | 0     | Session type                  | 7             |                                | For SFTP connections it's always "7".                                                                                                                                                                                                                                  |
   | 1     | Remote hostname or IP address | localhost     | Basic Sftp settings            | Cannot be empty                                                                                                                                                                                                                                                        |
   | 2     | Port                          | 22            | Basic Sftp settings            | (self-explanatory)                                                                                                                                                                                                                                                     |
   | 3     | Username (specific only)      | (empty)       | Basic Sftp settings            | The default login when empty is set in-app and its default is the Windows login                                                                                                                                                                                        |
   | 4     | UTF-8 Charset                 | -1            | Advanced Sftp settings         | enabled "-1", disabled "0"                                                                                                                                                                                                                                             |
   | 5     | Compression                   | 0             | Advanced Sftp settings         | enabled "-1", disabled "0"                                                                                                                                                                                                                                             |
   | 6     | Remote startup folder         | (empty)       | Advanced Sftp settings         | Both relative and absolute paths seem to be allowed.                                                                                                                                                                                                                   |
   | 7     | ASCII mode                    | 0             | Advanced Sftp settings         | enabled "-1", disabled "0"                                                                                                                                                                                                                                             |
   | 8     | 2-steps authentication        | 0             | Advanced Sftp settings         | enabled "-1", disabled "0"                                                                                                                                                                                                                                             |
   | 9     | Use private key               | (empty)       | Advanced Sftp settings         | Private key path. 'C' drive letter in the path is changed to "`_CurrentDrive_`" in the setting.                                                                                                                                                                        |
   | 10    | Proxy settings                | 0             | Advanced Sftp settings - Proxy | No proxy "0", Socks4 Proxy "1", Socks4 Proxy with authentication "2", Socks5 Proxy "3", Socks5 Proxy with authentication "4", Web proxy "5", Web proxy with basic authentication "6", Web proxy with digest authentication "7", Web proxy with NTLM authentication "8" |
   | 11    | Proxy server                  | (empty)       | Advanced Sftp settings - Proxy | (self-explanatory)                                                                                                                                                                                                                                                     |
   | 12    | Proxy port                    | 1080          | Advanced Sftp settings - Proxy | (the default is set even if the Proxy type is "None")                                                                                                                                                                                                                  |
   | 13    | Proxy username                | (empty)       | Advanced Sftp settings - Proxy |                                                                                                                                                                                                                                                                        |
   | 14    | Proxy password                | (empty)       | Advanced Sftp settings - Proxy | WARNING: The password is stored plaintext!                                                                                                                                                                                                                             |
   | 15    | Local startup folder          | (empty)       | Advanced Sftp settings         | The folder path, without replacement it seems ("C:\\" stays as-is)                                                                                                                                                                                                     |
   | 16    | Preserve file dates           | -1            | Advanced Sftp settings         | enabled "-1", disabled "0"                                                                                                                                                                                                                                             |

4. The second group of session characteristics, separated by the '%' character, is identical to the SSH one but only the "Lock terminal title" (index 14) is used in SFTP:

   | Index | SSH Property  | Default Value | Note                                        |
   |-------|---------------|---------------|---------------------------------------------|
   | 0     | Terminal font | MobaFont      | Any installed font + the builtin "MobaFont" |
   | ...   |               |               |                                             |

5. Start session in: "0" for "Normal tab" (default), "1" for "Detached tab", "2" for "Maximized detached tab", "3" for "Fullscreen".

6. The "Comments" field: empty if empty (default), else the comment with any '#' changed to "`__DIEZE__`", no `%` is allowed in the field.

7. Custom tab color: "-1" if unchecked (default), if checked the decimal value of the RGB color ("536870911" for the default color (whitish), "0" for black, "255" for pure red, "65280" for pure green, "16711680" for pure blue)

#### Browser Session lines

By comparing sessions with a changed parameter against a reference session, the full list has been identified as:

1. "`;  logout`" if "Display reconnection message" is unchecked in "Bookmark settings", empty if it's checked.

2. The icon number of the session (see list below) (the default for Browser is 313)

3. The first group of session characteristics, separated by the '%' character (quotes indicate literal strings or numbers):

   | Index | RDP Property                     | Default Value | Section                   | Note                                                                                                                                      |
   |-------|----------------------------------|---------------|---------------------------|-------------------------------------------------------------------------------------------------------------------------------------------|
   | 0     | Session type                     | 11            |                           | For Browser connections it's always "11".                                                                                                 |
   | 1     | Remote hostname or IP address    | localhost     | Basic Browser settings    | Cannot be empty                                                                                                                           |
   | 2     | Display top bar                  | -1            | Advanced Browser settings | enabled "-1", disabled "0", 0 only if all "Display X" below are disabled too                                                              |
   | 3     | Display back button              | -1            | Advanced Browser settings | enabled "-1", disabled "0"                                                                                                                |
   | 4     | Display forward button           | -1            | Advanced Browser settings | enabled "-1", disabled "0"                                                                                                                |
   | 5     | Display refresh button           | -1            | Advanced Browser settings | enabled "-1", disabled "0"                                                                                                                |
   | 6     | Display stop button              | -1            | Advanced Browser settings | enabled "-1", disabled "0"                                                                                                                |
   | 7     | Display home button              | -1            | Advanced Browser settings | enabled "-1", disabled "0"                                                                                                                |
   | 8     | Display address bar              | -1            | Advanced Browser settings | enabled "-1", disabled "0"                                                                                                                |
   | 9     | External popup windows           | 0             | Advanced Browser settings | enabled "-1", disabled "0"                                                                                                                |
   | 10    | IE Emulation level               | 0             | Advanced Browser settings | No emulation "0", IE7 "1", IE8 "2", IE9 "3", IE10 "4", IE11 "5"                                                                           |
   | 11    | Browser engine                   | 0             | Advanced Browser settings | Internet Explorer "0", Google Chrome "1", Mozilla Firefox "2", Microsoft Edge "3"                                                         |
   | 12    | Edge - Display top bar           | -1            | Advanced Browser settings | enabled "-1", disabled "0"                                                                                                                |
   | 13    | Edge - Enable context menus      | -1            | Advanced Browser settings | enabled "-1", disabled "0"                                                                                                                |
   | 14    | Edge - External popup windows    | 0             | Advanced Browser settings | enabled "-1", disabled "0"                                                                                                                |
   | 15    | Edge - Enable Smartscreen        | -1            | Advanced Browser settings | enabled "-1", disabled "0"                                                                                                                |
   | 16    | Edge - Allow insecure localhost  | 0             | Advanced Browser settings | enabled "-1", disabled "0"                                                                                                                |
   | 17    | Edge - Use Edge stored passwords | -1            | Advanced Browser settings | enabled "-1", disabled "0"                                                                                                                |
   | 18    | Edge - Proxy                     | 0             | Advanced Browser settings | System proxy settings "0", No proxy (direct connection) "1", Autodetect proxy "2", Specify a proxy server "3", Specify a proxy script "4" |
   | 19    | Edge - Proxy server or script    | (empty)       | Advanced Browser settings | Proxy server host or .pac file URL depending on the above setting                                                                         |
   | 20    | Edge - Proxy port                | (empty)       | Advanced Browser settings | Proxy port                                                                                                                                |

4. The second group of session characteristics, separated by the '%' character, is identical to the SSH one but only the "Lock terminal title" (index 14) is used in SFTP:

   | Index | SSH Property  | Default Value | Note                                        |
   |-------|---------------|---------------|---------------------------------------------|
   | 0     | Terminal font | MobaFont      | Any installed font + the builtin "MobaFont" |
   | ...   |               |               |                                             |

5. Start session in: "0" for "Normal tab" (default), "1" for "Detached tab", "2" for "Maximized detached tab", "3" for "Fullscreen".

6. The "Comments" field: empty if empty (default), else the comment with any '#' changed to "`__DIEZE__`", no `%` is allowed in the field.

7. Custom tab color: "-1" if unchecked (default), if checked the decimal value of the RGB color ("536870911" for the default color (whitish), "0" for black, "255" for pure red, "65280" for pure green, "16711680" for pure blue)

#### Annotated list of session icons

The icons in the following screenshot are the property of MOBATEK SARL.

![MobaXterm-session-icons-annotated](https://user-images.githubusercontent.com/3818364/211368876-2ff74ccf-173f-4af9-b6cb-de76e2eeee85.png)

#### Default icons per session type

| Session type | Default session icon |
|:------------:|:--------------------:|
|     SSH      |         109          |
|    Telnet    |          98          |
|     Rsh      |         100          |
|    Xdmcp     |          88          |
|     RDP      |          91          |
|     VNC      |         128          |
|     FTP      |         130          |
|     SFTP     |         140          |
|    Serial    |         131          |
|     File     |          84          |
|    Shell     |          97          |
|   Browser    |         313          |
|     Mosh     |         145          |
|    Aws S3    |         343          |
|     WSL      |         151          |

