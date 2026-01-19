/**
 * Parser registry and format detection
 */

const fs = require('fs');
const path = require('path');
const mobaxtermParser = require('./mobaxterm');
const superputtyParser = require('./superputty');
const { createParseResult } = require('../session');

// Available parsers
const parsers = {
    mobaxterm: mobaxtermParser,
    superputty: superputtyParser
};

/**
 * Detects the format of files in a directory
 * @param {string} dataDir - Directory to scan
 * @returns {string} Detected format: 'mobaxterm', 'superputty', 'mixed', or 'unknown'
 */
function detectFormat(dataDir) {
    const files = fs.readdirSync(dataDir, 'utf8');

    let hasIni = false;
    let hasXml = false;

    for (const file of files) {
        const ext = path.extname(file).toLowerCase();
        if (ext === '.ini' || ext === '.mxtsessions') {
            hasIni = true;
        } else if (ext === '.xml') {
            hasXml = true;
        }
    }

    if (hasIni && hasXml) {
        return 'mixed';
    } else if (hasIni) {
        return 'mobaxterm';
    } else if (hasXml) {
        return 'superputty';
    }

    return 'unknown';
}

/**
 * Parses all supported files in a directory
 * @param {string} dataDir - Directory containing session files
 * @param {Object} options - Parse options
 * @param {string} options.format - Force specific format: 'auto', 'mobaxterm', 'superputty'
 * @returns {Object} Combined parse result
 */
function parse(dataDir, options = {}) {
    const format = options.format || 'auto';

    // Detect format if auto
    let detectedFormat = format;
    if (format === 'auto') {
        detectedFormat = detectFormat(dataDir);
        console.log('Detected format:', detectedFormat);
    }

    // Handle mixed format - parse both
    if (detectedFormat === 'mixed') {
        console.log('Mixed formats detected, parsing both MobaxTerm and SuperPutty files...');
        const mobaResult = parsers.mobaxterm.parse(dataDir);
        const superputtyResult = parsers.superputty.parse(dataDir);

        // Merge results
        const combined = createParseResult();
        combined.sourceFormat = 'mixed';
        combined.sessions = [...mobaResult.sessions, ...superputtyResult.sessions];
        combined.stats.ssh = mobaResult.stats.ssh + superputtyResult.stats.ssh;
        combined.stats.rdp = mobaResult.stats.rdp + superputtyResult.stats.rdp;
        combined.stats.vnc = mobaResult.stats.vnc + superputtyResult.stats.vnc;
        combined.stats.telnet = (mobaResult.stats.telnet || 0) + (superputtyResult.stats.telnet || 0);
        combined.stats.other = mobaResult.stats.other + superputtyResult.stats.other;
        combined.stats.total = mobaResult.stats.total + superputtyResult.stats.total;
        combined.errors = [...mobaResult.errors, ...superputtyResult.errors];

        return combined;
    }

    // Parse with specific format
    if (detectedFormat === 'mobaxterm') {
        return parsers.mobaxterm.parse(dataDir);
    } else if (detectedFormat === 'superputty') {
        return parsers.superputty.parse(dataDir);
    }

    // Unknown format
    console.error('No supported files found in directory');
    const result = createParseResult();
    result.errors.push({ file: dataDir, error: 'No supported files found' });
    return result;
}

/**
 * Gets a specific parser by name
 * @param {string} name - Parser name
 * @returns {Object} Parser module
 */
function getParser(name) {
    return parsers[name];
}

/**
 * Lists available parser names
 * @returns {string[]} Array of parser names
 */
function listParsers() {
    return Object.keys(parsers);
}

module.exports = {
    parse,
    detectFormat,
    getParser,
    listParsers,
    parsers
};
