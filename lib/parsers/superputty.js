/**
 * SuperPutty XML file parser
 * Parses Sessions.xml files exported from SuperPutty
 */

const fs = require('fs');
const path = require('path');
const { XMLParser } = require('fast-xml-parser');
const { SessionType, createSession, createParseResult } = require('../session');

// SuperPutty protocol mapping
const SUPERPUTTY_PROTOCOLS = {
    'SSH': SessionType.SSH,
    'SSH2': SessionType.SSH,
    'Telnet': SessionType.TELNET,
    'Rlogin': SessionType.OTHER,
    'Raw': SessionType.OTHER,
    'Serial': SessionType.SERIAL,
    'Cygterm': SessionType.OTHER,
    'Mintty': SessionType.OTHER,
    'VNC': SessionType.VNC,
    'RDP': SessionType.RDP,
    'WINCMD': SessionType.OTHER,
    'PS': SessionType.OTHER,
    'SSHNet': SessionType.SSH
};

/**
 * Maps SuperPutty protocol to unified SessionType
 * @param {string} proto - SuperPutty protocol string
 * @returns {string} Unified session type
 */
function mapProtocol(proto) {
    return SUPERPUTTY_PROTOCOLS[proto] || SessionType.OTHER;
}

/**
 * Extracts folder path and session name from SessionId
 * SessionId format: "Folder1/Folder2/SessionName"
 * @param {string} sessionId - Full session ID
 * @returns {Object} Object with folderPath and sessionName
 */
function parseSessionId(sessionId) {
    if (!sessionId) {
        return { folderPath: '', sessionName: '' };
    }

    const parts = sessionId.split('/');
    const sessionName = parts.pop() || '';
    const folderPath = parts.join('/');

    return { folderPath, sessionName };
}

/**
 * Parses ExtraArgs for additional SSH settings
 * Common PuTTY args: -i keyfile.ppk, -A (agent), -X (X11), -P port
 * @param {string} extraArgs - Extra arguments string
 * @returns {Object} Parsed settings
 */
function parseExtraArgs(extraArgs) {
    const result = {
        identityFile: '',
        forwardAgent: false,
        x11Forward: false
    };

    if (!extraArgs) return result;

    // Parse -i for identity file (handles quoted paths with spaces)
    // Try quoted paths first, then unquoted
    const quotedMatch = extraArgs.match(/-i\s+["']([^"']+)["']/i);
    const unquotedMatch = extraArgs.match(/-i\s+([^\s"']+)/i);

    if (quotedMatch) {
        result.identityFile = quotedMatch[1];
    } else if (unquotedMatch) {
        result.identityFile = unquotedMatch[1];
    }

    // Check for -A (agent forwarding)
    if (/-A\b/.test(extraArgs)) {
        result.forwardAgent = true;
    }

    // Check for -X (X11 forwarding)
    if (/-X\b/.test(extraArgs)) {
        result.x11Forward = true;
    }

    return result;
}

/**
 * Converts a SuperPutty SessionData element to unified session
 * @param {Object} sessionData - Parsed SessionData attributes
 * @returns {Object} Unified session object
 */
function convertToSession(sessionData) {
    const { folderPath, sessionName } = parseSessionId(sessionData.SessionId);
    const extraArgsSettings = parseExtraArgs(sessionData.ExtraArgs);
    const sessionType = mapProtocol(sessionData.Proto);

    return createSession({
        host: sessionData.Host || '',
        port: sessionData.Port ? String(sessionData.Port) : '22',
        username: sessionData.Username || '',
        sessionName: sessionData.SessionName || sessionName,
        folderPath: folderPath,
        sessionType: sessionType,
        identityFile: extraArgsSettings.identityFile,
        forwardAgent: extraArgsSettings.forwardAgent,
        x11Forward: extraArgsSettings.x11Forward,
        note: sessionData.Note || '',
        sourceFormat: 'superputty'
    });
}

/**
 * Parses a SuperPutty Sessions.xml file
 * @param {string} filePath - Path to the XML file
 * @param {Object} result - Parse result object to populate
 */
function parseFile(filePath, result) {
    const xmlContent = fs.readFileSync(filePath, 'utf8');

    const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: '',
        parseAttributeValue: true
    });

    const parsed = parser.parse(xmlContent);

    // Handle various XML structures SuperPutty might use
    let sessionDataArray = [];

    if (parsed.ArrayOfSessionData && parsed.ArrayOfSessionData.SessionData) {
        sessionDataArray = parsed.ArrayOfSessionData.SessionData;
    } else if (parsed.SessionData) {
        sessionDataArray = parsed.SessionData;
    }

    // Ensure it's an array
    if (!Array.isArray(sessionDataArray)) {
        sessionDataArray = [sessionDataArray];
    }

    console.log(`Found ${sessionDataArray.length} session entries in ${path.basename(filePath)}`);

    for (const sessionData of sessionDataArray) {
        if (!sessionData || typeof sessionData !== 'object') continue;

        const sessionType = mapProtocol(sessionData.Proto);
        result.stats.total++;

        switch (sessionType) {
            case SessionType.SSH:
            case SessionType.SFTP:
                result.stats.ssh++;
                const session = convertToSession(sessionData);
                result.sessions.push(session);
                console.log('Found SSH config:', sessionData.SessionName || sessionData.SessionId);
                break;
            case SessionType.RDP:
                result.stats.rdp++;
                console.log('Skipping RDP config:', sessionData.SessionName || sessionData.SessionId);
                break;
            case SessionType.VNC:
                result.stats.vnc++;
                console.log('Skipping VNC config:', sessionData.SessionName || sessionData.SessionId);
                break;
            case SessionType.TELNET:
                result.stats.telnet++;
                console.log('Skipping Telnet config:', sessionData.SessionName || sessionData.SessionId);
                break;
            default:
                result.stats.other++;
                console.log('Skipping unknown config:', sessionData.SessionName || sessionData.SessionId);
        }
    }
}

/**
 * Parses all SuperPutty XML files in a directory
 * @param {string} dataDir - Directory containing .xml files
 * @returns {Object} Parse result with sessions and statistics
 */
function parse(dataDir) {
    const result = createParseResult();
    result.sourceFormat = 'superputty';

    console.log('Searching for SuperPutty XML files in:', dataDir);

    const files = fs.readdirSync(dataDir, 'utf8');

    for (const file of files) {
        const ext = path.extname(file).toLowerCase();
        if (ext === '.xml') {
            console.log('Loading XML content from:', file);
            try {
                parseFile(path.join(dataDir, file), result);
            } catch (err) {
                console.error(`Error parsing ${file}:`, err.message);
                result.errors.push({ file, error: err.message });
            }
        }
    }

    return result;
}

/**
 * Checks if a file is a SuperPutty format file
 * @param {string} filePath - Path to check
 * @returns {boolean} True if SuperPutty format
 */
function canParse(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    return ext === '.xml';
}

module.exports = {
    parse,
    canParse,
    parseFile,
    parseExtraArgs,
    parseSessionId
};
