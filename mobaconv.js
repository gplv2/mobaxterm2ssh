#!/usr/bin/env node

/**
 * CLI script to convert session configs from MobaxTerm or SuperPutty to OpenSSH format
 *
 * Supported input formats:
 *   - MobaxTerm: .ini or .mxtsessions files
 *   - SuperPutty: Sessions.xml files
 *
 * Sources to decode MobaxTerm format:
 *   https://gist.github.com/Ruzgfpegk/ab597838e4abbe8de30d7224afd062ea
 */

const fs = require('fs');
const os = require('os');
const path = require('path');

const { parsers, sshConfigGenerator, session } = require('./lib');

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
  --sshconfigfile <file>    Source SSH config file to merge with
                            Defaults to ~/.ssh/config
  --outputfile <file>       Target SSH config file
                            Defaults to --sshconfigfile value
  --replaceuser <old/new>   Replace a username everywhere (proxy and SSH user)
  --help                    Show this help information

Supported input formats:
  - MobaxTerm:   .ini or .mxtsessions files
  - SuperPutty:  Sessions.xml files

Examples:
  node mobaconv.js --datadir ./sessions/
  node mobaconv.js --datadir ./data/ --format superputty
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

// Validate format option
const validFormats = ['auto', 'mobaxterm', 'superputty'];
const format = flags.format || 'auto';
if (!validFormats.includes(format)) {
    console.error(`Error: Invalid format '${format}'. Valid options: ${validFormats.join(', ')}`);
    process.exit(1);
}

// Set up paths
const homeDirectory = os.homedir();
const sshConfigFile = flags.sshconfigfile || path.join(homeDirectory, '.ssh/config');
const outputFile = flags.outputfile || sshConfigFile;

console.log('');
console.log('='.repeat(60));
console.log('Session Config Converter');
console.log('='.repeat(60));
console.log('Data directory:', dataDir);
console.log('Format:', format);
console.log('SSH config source:', sshConfigFile);
console.log('Output file:', outputFile);
console.log('='.repeat(60));
console.log('');

// Parse input files
const parseResult = parsers.parse(dataDir, { format });

// Check if we found any SSH sessions
if (parseResult.sessions.length === 0) {
    console.log('');
    console.log('No SSH sessions found to convert.');
    console.log('');
    printStats(parseResult);
    process.exit(0);
}

// Generate SSH config
try {
    sshConfigGenerator.generate(parseResult.sessions, {
        sshConfigFile: sshConfigFile,
        outputFile: outputFile,
        replaceUser: flags.replaceuser,
        backup: true
    });
} catch (err) {
    console.error('Error generating SSH config:', err.message);
    process.exit(1);
}

// Print statistics
console.log('');
printStats(parseResult);
console.log('');
console.log('Done! Check', outputFile, 'for the results.');

/**
 * Prints parsing statistics
 * @param {Object} result - Parse result object
 */
function printStats(result) {
    console.log('='.repeat(60));
    console.log('Statistics');
    console.log('='.repeat(60));
    console.log('Source format:', result.sourceFormat);
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
