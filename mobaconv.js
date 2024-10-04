#!/usr/bin/env node

/*
 * CLI script to read mobaterm ini file (windows) and produce a ssh client config from the contents
 *
 * Sources to decode this : https://gist.github.com/Ruzgfpegk/ab597838e4abbe8de30d7224afd062ea
 *
 */


const args = process.argv;
console.log(args);

var fs = require("fs");
const os = require('os');
const path = require("path");

/*
const format = (num, decimals) => num.toLocaleString('nl-BE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
});
*/

// Simple function to parse command-line arguments
function parseArgs() {
  const args = process.argv.slice(2); // Ignore the first two (node and script paths)
  const flags = {};

  // Loop through arguments
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].substring(2); // Remove '--'
      // Check if next argument is a flag or a value
      const nextArg = args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true;
      flags[key] = nextArg; // Store the flag and its value, or true for flags like --help
      if (nextArg !== true) i++; // Skip the value in the loop if it is not a boolean flag
    }
  }

    return flags;
}

// Parse the flags
const flags = parseArgs();
console.log(flags);

// Function to display help message
function displayHelp() {
    console.log(`
Usage: node ${args[1]} [options]

Options:
  --datadir <dir>               The place where one or more of your mobaterm ini files are, defaults to ./data/
  --sshconfigfile <file>        The source ssh client config file, if omited defaults to the .ssh/config relative to userhome
  --outputfile <file>           The target ssh config file, defaults to sshconfigfile if omited
  --replaceuser <old/new> Replace a username with another one everywhere (proxy and ssh user)
  --help                        Show help information
  `);
}

// Check if the help flag is passed
if (flags.help) {
    displayHelp();
    process.exit(0);  // Exit the script after displaying help
}

// Example: If --datadir is provided, create a correct directory path
if (flags.datadir) {
    // Resolve the directory path (if it's relative, make it absolute)
    const dataDirPath = path.resolve(flags.datadir);

    console.log(`Directory does not exist: ${dataDirPath}`);
    // Ensure the directory exists, or create it if it doesn't
    if (!fs.existsSync(dataDirPath)) {
        console.log(`Directory does not exist: ${dataDirPath}`);
        process.exit(0);  // Exit the script after displaying help
    } else {
        flags.datadir = dataDirPath;
    }
}

// Check if replaceuser is passed it's useful
if (flags.replaceuser) {
  // Ensure that the flag contains a '/'
  if (!flags.replaceuser.includes('/')) {
    console.error("Error: The --replaceuser flag must be in the format old/new.");
    process.exit(1); // Exit the script with a non-zero status code to indicate failure
  }
}

function splitStr(str, separator) {
    // Function to split string
    let string = str.split(separator);
    //console.log(string);
    return(string);
}

// Function to create a backup copy with datetime appended
function backupFile(filename) {
    // Check if the file exists
    if (!fs.existsSync(filename)) {
        console.log(`File ${filename} does not exist. Not taking backup copy.`);
        return;
    }

    // Get the current datetime
    const now = new Date();
    const datetime = now.toISOString().replace(/:/g, '-'); // Format datetime (replace ':' to avoid issues in filenames)

    // Get the file extension and base name
    const ext = path.extname(filename); // e.g., '.txt'
    const basename = path.basename(filename, ext); // e.g., 'file'

    // Create the new backup filename with datetime appended
    const backupFilename = `${basename}-${datetime}${ext}`;

    // Copy the original file to the new backup file
    fs.copyFileSync(filename, backupFilename);

    console.log(`Backup created for ${filename} : ${backupFilename}`);
}

var iniReader = require('inireader');
var resultArray = [];

const SSHConfig = require('ssh-config');
const util = require('util');
const parser = new iniReader.IniReader();
const dataFolder = flags.datadir ? flags.datadir : './data/';

// the user's home directory
const homeDirectory = os.homedir();

console.log("Searching for all ini files in: " + dataFolder);

/* regexes as named constants to make the code more naturally readable */
const BookmarkLineRex = /^Bookmarks_(\d+)/;
const SubRepLineRex = /^SubRep$/;
const ImgNumLineRex = /^ImgNum$/;

// mapping to these fields
const fields = [ 'session_type', 'remote_host', 'port', 'username', 'empty_1', 'x11_fwd', 'compression', 'command', 'ssh_gateway_host_list', 'ssh_gateway_port_list', 'ssh_gateway_user_list', 'noexit', 'use_username', 'remote_env', 'private_key_path', 'ssh_gateway_private_key_list', 'ssh_browser_type', 'follow_ssh_path', 'empty_2', 'proxy_type', 'proxy_host', 'proxy_port', 'proxy_login', 'adapt_remote_locals', 'file_browser', 'file_browser_protocol', 'local_proxy_command', 'ssh_version', 'key_exchange_algo', 'host_key_types', 'ciphers', 'disconnect_no_auth', 'prefered_hostkey_algo', 'use_ssh_agent_auth', 'allow_agent_forwarding' ];

fs.readdirSync(dataFolder,'utf8').forEach(file => {

    var ext = path.extname(file);

    if (ext == '.ini') {
        console.log("Loading ini content from : " + file);

        parser.load(path.join(dataFolder,file), 'utf8' );

        var obj = parser.getBlock();

        var cnt_ssh = 0;
        var cnt_other = 0;
        var cnt_rdp = 0;

        var xpath;

        console.log("Scanning for bookmarks ...");
        for (let key in obj) {
            if (BookmarkLineRex.test(key)) {
                console.log(key);
                let child_node_count = Object.keys(obj[key]).length;
                if (child_node_count==2){
                    // Empty Bookmark, probably main category in app
                    console.log('Main group:' + xpath);
                    // continue;
                } else {
                    // Bookmark with node info, probably subcat
                    // Here we should have real client machines since count != 2
                    for (let nodeline in obj[key]) {
                        if (SubRepLineRex.test(nodeline)){
                            // This is the name of the group
                            console.log("Subgroup: " + obj[key][nodeline]);
                            xpath = obj[key][nodeline];
                        }
                        if (!SubRepLineRex.test(nodeline) && !ImgNumLineRex.test(nodeline)){
                            // These are the actual connection settings for labeled (key)
                            var node_line = obj[key][nodeline];

                            var groups = splitStr(node_line, '#');
                            var config_group = splitStr(groups[2], '%');
                            if (config_group[0] === '0'){
                                // First number is 0 , it means ssh session
                                console.log('Found an ssh config: %s', nodeline);

                                // Combine fields with their respective values
                                const result = fields.reduce((obj, field, index) => {
                                    obj[field] = config_group[index] || '';  // Use an empty string if there's no corresponding value
                                    return obj;
                                }, {});

                                // Push the result object into the resultArray
                                // first some New key-value pair to add
                                let newKeyValue = { host_label : nodeline };
                                Object.assign(result, newKeyValue);

                                newKeyValue = { group_section : xpath };
                                Object.assign(result, newKeyValue);

                                // use ssh-agent: ssh-add --apple-use-keychain YOUR-KEY (on mac)
                                newKeyValue = { 'forward_agent' : 'yes' };
                                Object.assign(result, newKeyValue);

                                //console.log(result);

                                resultArray.push(result);
                                //console.log('pushed config number %d', resultArray.length);

                                cnt_ssh++;
                            } else if (config_group[0] === '4'){
                                // First number is 4 , it means rdp session
                                console.log('Skipping Windows RDP config');
                                cnt_rdp++;
                            } else {
                                console.log('Skipping unknown config');
                                cnt_other++;
                            }
                        }
                    }
                }
            }
        }

        // Building ssh config

        const sshconfigfilePath = flags.sshconfigfile ? flags.sshconfigfile : path.join(homeDirectory , '.ssh/config');
        const outputfilePath = flags.outputfile ? flags.outputfile : sshconfigfilePath;

        console.log('Loading ssh config file %s', sshconfigfilePath);
        console.log('Will write output to %s', outputfilePath);

        try {
            const fileContent = fs.readFileSync(sshconfigfilePath, 'utf8');
            const config = SSHConfig.parse(fileContent);

            resultArray.forEach((item, index) => {
                console.log('Generate host config %d', index + 1);

                // create proxy_jump from other vars
                let proxy_jump;

                // Check if the --replaceuser flag is provided
                if (flags.replaceuser) {
                    // Split the value by "/" to get the old and new usernames
                    const [oldUsername, newUsername] = flags.replaceuser.split('/');

                    // Replace item.username if it matches oldUsername
                    if (item.username === oldUsername) {
                        item.username = newUsername;
                        console.log(`Username replaced: ${oldUsername} -> ${newUsername}`);
                    }

                    // Replace item.username if it matches oldUsername
                    if (item.ssh_gateway_user_list === oldUsername) {
                        item.ssh_gateway_user_list = newUsername;
                        console.log(`Gateway replaced: ${oldUsername} -> ${newUsername}`);
                    }
                }

                // This only supports 1 key for now
                if (item.ssh_gateway_host_list.length !== 0) {
                    proxy_jump = util.format('%s@%s:%s', item.ssh_gateway_user_list || item.username, item.ssh_gateway_host_list || '' , item.ssh_gateway_port_list || 22);
                }

                config.prepend({
                    '### ': item.group_section,
                    '#': item.host_label,
                    Host: item.remote_host.toLowerCase(),
                    Port: item.port ? item.port : '22',
                    HostName: item.remote_host.toLowerCase(),
                    ProxyJump: proxy_jump ? proxy_jump : '',
                    User: item.username ? item.username : 'nobody',
                    IdentityFile : item.ssh_gateway_private_key_list ? item.ssh_gateway_private_key_list : '~/.ssh/id_ed2551',
                    ForwardAgent : item.forward_agent
                });
            });

            // List of specific keys (like 'ProxyJump') that should be removed if they have no value
            const keysToCheck = ['ProxyJump'];

            try {
                // Make a backup of the file we're about to (over)write first
                backupFile(outputfilePath);

                config.forEach((host) => {
                    // Ensure host.config is defined and is an array
                    if (Array.isArray(host.config)) {
                        // Filter out any specific key (e.g., ProxyJump) that has an empty or undefined value
                        host.config = host.config.filter(entry => {
                            // Only target specific keys (like ProxyJump) for removal if their value is empty or undefined
                            if (keysToCheck.includes(entry.param)) {
                                return entry.value && entry.value.trim() !== ''; // Remove if value is empty or just whitespace
                            }
                            // Keep all other entries, even if they have no value
                            return true;
                        });
                    }
                });

                fs.writeFileSync(outputfilePath,SSHConfig.stringify(config));

            } catch (err) {
                console.error(err);
            }

        } catch (err) {
            console.error('Error reading the file:', err);
        }

        console.log('Found ssh configs: %d', cnt_ssh);
        console.log('Found rdp configs: %d', cnt_rdp);
        console.log('count other : %d', cnt_other);
        console.log('Done');
        //console.log('Done! check %s for the results', filePath);
    }
});
