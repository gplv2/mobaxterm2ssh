# This tool will convert your mobaxterm.ini to a .ssh/config file 

It will take a backup to your current workdir and preserve existing entries

See the work done here to understand the ini format:

Sources to decode this : https://gist.github.com/Ruzgfpegk/ab597838e4abbe8de30d7224afd062ea

This work enabled me to quickly write a CLI tool to help me convert. I'm not a node/js specialist, I just think it's a fun language to play with.

That also means that sometimes I go nuts trying to select the proper const/var/let assignment, the code just works for me atm.

the example ini file included is obfuscated and cleaned up of any internal info that would not be nice to be leaked.

# usage

```
Usage: node mobaconv.js [options]

Options:
  --datadir <dir>               The place where one or more of your mobaterm ini files are, defaults to ./data/
  --sshconfigfile <file>        The source ssh client config file, if omited defaults to the .ssh/config relative to userhome
  --outputfile <file>           The target ssh config file, defaults to sshconfigfile if omited
  --replaceuser <old/new> Replace a username with another one everywhere (proxy and ssh user)
  --help                        Show help information
```
