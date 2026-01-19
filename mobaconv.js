#!/usr/bin/env node

/**
 * CLI script to convert session configs between formats
 *
 * Supported input formats:
 *   - MobaxTerm: .ini or .mxtsessions files
 *   - SuperPutty: Sessions.xml files
 *
 * Supported output formats:
 *   - sshconfig: OpenSSH ~/.ssh/config format
 *   - superputty: SuperPutty Sessions.xml format
 *
 * Sources to decode MobaxTerm format:
 *   https://gist.github.com/Ruzgfpegk/ab597838e4abbe8de30d7224afd062ea
 */

const fs = require('fs');
const os = require('os');
const path = require('path');

const { parsers, generators } = require('./lib');

const args = process.argv;
console.log(args);

/**
 * Parses command-line arguments
 * @returns {Object} Parsed flags object
 */
function parseArgs() {
    const args = process.argv.slice(2);
    const flags = {};

    for (let i = 0; i < args.length; i++) {
        if (args[i].startsWith('--')) {
            const key = args[i].substring(2);
            const nextArg = args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true;
            flags[key] = nextArg;
            if (nextArg !== true) i++;
        }
    }

    return flags;
}

/**
 * Displays help information
 */
function displayHelp() {
    console.log(`
Usage: node ${args[1]} [options]

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
  --help                    Show this help information

Supported input formats:
  - MobaxTerm:   .ini or .mxtsessions files
  - SuperPutty:  Sessions.xml files

Supported output formats:
  - sshconfig:   OpenSSH ~/.ssh/config format
  - superputty:  SuperPutty Sessions.xml format

Examples:
  # MobaxTerm to SSH config (default)
  node mobaconv.js --datadir ./sessions/

  # MobaxTerm to SuperPutty
  node mobaconv.js --datadir ./data/ --output-format superputty --outputfile Sessions.xml

  # SuperPutty to SSH config
  node mobaconv.js --datadir ./data/ --format superputty

  # With username replacement
  node mobaconv.js --datadir ./data/ --replaceuser olduser/newuser
  `);
}

// Parse command line arguments
const flags = parseArgs();
console.log(flags);

// Check for help flag
if (flags.help) {
    displayHelp();
    process.exit(0);
}

// Validate and resolve data directory
let dataDir = flags.datadir ? path.resolve(flags.datadir) : './data/';
if (!fs.existsSync(dataDir)) {
    console.error(`Error: Directory does not exist: ${dataDir}`);
    process.exit(1);
}

// Validate replaceuser format
if (flags.replaceuser && !flags.replaceuser.includes('/')) {
    console.error("Error: The --replaceuser flag must be in the format old/new.");
    process.exit(1);
}

// Validate input format option
const validInputFormats = ['auto', 'mobaxterm', 'superputty'];
const inputFormat = flags.format || 'auto';
if (!validInputFormats.includes(inputFormat)) {
    console.error(`Error: Invalid input format '${inputFormat}'. Valid options: ${validInputFormats.join(', ')}`);
    process.exit(1);
}

// Validate output format option
const validOutputFormats = ['sshconfig', 'superputty'];
const outputFormat = flags['output-format'] || 'sshconfig';
if (!validOutputFormats.includes(outputFormat)) {
    console.error(`Error: Invalid output format '${outputFormat}'. Valid options: ${validOutputFormats.join(', ')}`);
    process.exit(1);
}

// Set up paths
const homeDirectory = os.homedir();

// Determine default output file based on output format
let defaultOutputFile;
if (outputFormat === 'sshconfig') {
    defaultOutputFile = flags.sshconfigfile || path.join(homeDirectory, '.ssh/config');
} else if (outputFormat === 'superputty') {
    defaultOutputFile = 'Sessions.xml';
}

const sshConfigFile = flags.sshconfigfile || path.join(homeDirectory, '.ssh/config');
const outputFile = flags.outputfile || defaultOutputFile;

console.log('');
console.log('='.repeat(60));
console.log('Session Config Converter');
console.log('='.repeat(60));
console.log('Data directory:', dataDir);
console.log('Input format:', inputFormat);
console.log('Output format:', outputFormat);
if (outputFormat === 'sshconfig') {
    console.log('SSH config source:', sshConfigFile);
}
console.log('Output file:', outputFile);
console.log('='.repeat(60));
console.log('');

// Parse input files
const parseResult = parsers.parse(dataDir, { format: inputFormat });

// Check if we found any SSH sessions
if (parseResult.sessions.length === 0) {
    console.log('');
    console.log('No SSH sessions found to convert.');
    console.log('');
    printStats(parseResult, outputFormat);
    process.exit(0);
}

// Apply username replacement if specified
let sessions = parseResult.sessions;
if (flags.replaceuser) {
    sessions = applyUserReplacement(sessions, flags.replaceuser);
}

// Generate output based on format
try {
    if (outputFormat === 'sshconfig') {
        generators.sshconfig.generate(sessions, {
            sshConfigFile: sshConfigFile,
            outputFile: outputFile,
            backup: true
        });
    } else if (outputFormat === 'superputty') {
        generators.superputty.generate(sessions, {
            outputFile: outputFile,
            backup: true
        });
    }
} catch (err) {
    console.error('Error generating output:', err.message);
    process.exit(1);
}

// Print statistics
console.log('');
printStats(parseResult, outputFormat);
console.log('');
console.log('Done! Check', outputFile, 'for the results.');

/**
 * Applies username replacement to sessions
 * @param {Object[]} sessions - Array of session objects
 * @param {string} replaceUser - Replace spec in "old/new" format
 * @returns {Object[]} Sessions with replaced usernames
 */
function applyUserReplacement(sessions, replaceUser) {
    const [oldUsername, newUsername] = replaceUser.split('/');

    return sessions.map(session => {
        const updated = { ...session };

        if (session.username === oldUsername) {
            updated.username = newUsername;
            console.log(`Username replaced: ${oldUsername} -> ${newUsername} (${session.host})`);
        }

        if (session.jumpUser === oldUsername) {
            updated.jumpUser = newUsername;
            console.log(`Jump user replaced: ${oldUsername} -> ${newUsername} (${session.host})`);
        }

        return updated;
    });
}

/**
 * Prints parsing statistics
 * @param {Object} result - Parse result object
 * @param {string} outputFormat - Output format used
 */
function printStats(result, outputFormat) {
    console.log('='.repeat(60));
    console.log('Statistics');
    console.log('='.repeat(60));
    console.log('Source format:', result.sourceFormat);
    console.log('Output format:', outputFormat);
    console.log('SSH sessions converted:', result.stats.ssh);
    console.log('RDP sessions skipped:', result.stats.rdp);
    console.log('VNC sessions skipped:', result.stats.vnc || 0);
    console.log('Telnet sessions skipped:', result.stats.telnet || 0);
    console.log('Other sessions skipped:', result.stats.other);
    console.log('Total sessions processed:', result.stats.total);

    if (result.errors.length > 0) {
        console.log('');
        console.log('Errors:');
        result.errors.forEach(err => {
            console.log(`  - ${err.file}: ${err.error}`);
        });
    }
    console.log('='.repeat(60));
}
