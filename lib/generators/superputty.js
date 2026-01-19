/**
 * SuperPutty XML Generator
 * Converts unified session objects to SuperPutty Sessions.xml format
 */

const fs = require('fs');
const path = require('path');

/**
 * Escapes XML special characters
 * @param {string} str - String to escape
 * @returns {string} Escaped string
 */
function escapeXml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

/**
 * Maps unified session type to SuperPutty protocol
 * @param {string} sessionType - Unified session type
 * @returns {string} SuperPutty protocol string
 */
function mapProtocol(sessionType) {
    const mapping = {
        'ssh': 'SSH',
        'sftp': 'SSH',
        'telnet': 'Telnet',
        'rdp': 'RDP',
        'vnc': 'VNC',
        'serial': 'Serial'
    };
    return mapping[sessionType] || 'SSH';
}

/**
 * Builds ExtraArgs string from session settings
 * @param {Object} session - Unified session object
 * @returns {string} PuTTY command-line args
 */
function buildExtraArgs(session) {
    const args = [];

    if (session.identityFile) {
        // Quote path if it contains spaces
        const keyPath = session.identityFile.includes(' ')
            ? `"${session.identityFile}"`
            : session.identityFile;
        args.push(`-i ${keyPath}`);
    }

    if (session.forwardAgent) {
        args.push('-A');
    }

    if (session.x11Forward) {
        args.push('-X');
    }

    return args.join(' ');
}

/**
 * Builds SessionId from folder path and session name
 * @param {Object} session - Unified session object
 * @returns {string} SuperPutty SessionId (path/name format)
 */
function buildSessionId(session) {
    const folderPath = session.folderPath
        ? session.folderPath.replace(/\\/g, '/') // Convert backslashes to forward slashes
        : '';
    const name = session.sessionName || session.host;

    if (folderPath) {
        return `${folderPath}/${name}`;
    }
    return name;
}

/**
 * Converts a unified session to SuperPutty SessionData XML element
 * @param {Object} session - Unified session object
 * @returns {string} XML SessionData element
 */
function sessionToXml(session) {
    const sessionId = escapeXml(buildSessionId(session));
    const sessionName = escapeXml(session.sessionName || session.host);
    const host = escapeXml(session.host);
    const port = session.port || '22';
    const proto = mapProtocol(session.sessionType);
    const username = escapeXml(session.username || '');
    const extraArgs = escapeXml(buildExtraArgs(session));
    const note = escapeXml(session.note || '');

    return `  <SessionData SessionId="${sessionId}" SessionName="${sessionName}" Host="${host}" Port="${port}" Proto="${proto}" Username="${username}" PuttySession="Default Settings" ExtraArgs="${extraArgs}" Note="${note}" />`;
}

/**
 * Generates SuperPutty Sessions.xml content from sessions
 * @param {Object[]} sessions - Array of unified session objects
 * @returns {string} Complete XML document
 */
function generateXml(sessions) {
    const xmlHeader = '<?xml version="1.0" encoding="utf-8"?>';
    const rootOpen = '<ArrayOfSessionData xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">';
    const rootClose = '</ArrayOfSessionData>';

    const sessionElements = sessions.map(session => sessionToXml(session));

    return [
        xmlHeader,
        rootOpen,
        ...sessionElements,
        rootClose
    ].join('\n');
}

/**
 * Creates a backup copy of a file with datetime appended
 * @param {string} filename - File to backup
 */
function backupFile(filename) {
    if (!fs.existsSync(filename)) {
        return;
    }

    const now = new Date();
    const datetime = now.toISOString().replace(/:/g, '-');
    const ext = path.extname(filename);
    const basename = path.basename(filename, ext);
    const dir = path.dirname(filename);
    const backupFilename = path.join(dir, `${basename}-${datetime}${ext}`);

    fs.copyFileSync(filename, backupFilename);
    console.log(`Backup created: ${backupFilename}`);
}

/**
 * Generates SuperPutty XML file from sessions
 * @param {Object[]} sessions - Array of unified session objects
 * @param {Object} options - Generation options
 * @param {string} options.outputFile - Path to write output
 * @param {boolean} options.backup - Whether to backup existing file (default: true)
 */
function generate(sessions, options = {}) {
    const outputFile = options.outputFile || 'Sessions.xml';
    const shouldBackup = options.backup !== false;

    console.log('Generating SuperPutty XML...');
    console.log('Output file:', outputFile);

    const xmlContent = generateXml(sessions);

    try {
        if (shouldBackup) {
            backupFile(outputFile);
        }

        fs.writeFileSync(outputFile, xmlContent, 'utf8');
        console.log(`SuperPutty XML written successfully (${sessions.length} sessions)`);
    } catch (err) {
        console.error('Error writing SuperPutty XML:', err.message);
        throw err;
    }
}

module.exports = {
    generate,
    generateXml,
    sessionToXml,
    buildExtraArgs,
    buildSessionId,
    escapeXml
};
