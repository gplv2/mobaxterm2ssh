/**
 * MobaxTerm INI file parser
 * Parses .ini/.mxtsessions files exported from MobaxTerm
 */

const fs = require('fs');
const path = require('path');
const iniReader = require('inireader');
const { SessionType, createSession, createParseResult } = require('../session');

// Regex patterns for parsing MobaxTerm INI structure
const BookmarkLineRex = /^Bookmarks_(\d+)/;
const SubRepLineRex = /^SubRep$/;
const ImgNumLineRex = /^ImgNum$/;

// Field mapping for MobaxTerm session config (separated by %)
const FIELDS = [
    'session_type',
    'remote_host',
    'port',
    'username',
    'empty_1',
    'x11_fwd',
    'compression',
    'command',
    'ssh_gateway_host_list',
    'ssh_gateway_port_list',
    'ssh_gateway_user_list',
    'noexit',
    'use_username',
    'remote_env',
    'private_key_path',
    'ssh_gateway_private_key_list',
    'ssh_browser_type',
    'follow_ssh_path',
    'empty_2',
    'proxy_type',
    'proxy_host',
    'proxy_port',
    'proxy_login',
    'adapt_remote_locals',
    'file_browser',
    'file_browser_protocol',
    'local_proxy_command',
    'ssh_version',
    'key_exchange_algo',
    'host_key_types',
    'ciphers',
    'disconnect_no_auth',
    'prefered_hostkey_algo',
    'use_ssh_agent_auth',
    'allow_agent_forwarding'
];

// MobaxTerm session type codes
const MOBA_SESSION_TYPES = {
    '0': SessionType.SSH,
    '4': SessionType.RDP,
    '5': SessionType.VNC,
    '7': SessionType.SFTP,
    '11': SessionType.OTHER  // Browser
};

/**
 * Splits a string by a separator
 * @param {string} str - String to split
 * @param {string} separator - Separator character
 * @returns {string[]} Array of parts
 */
function splitStr(str, separator) {
    return str.split(separator);
}

/**
 * Maps MobaxTerm session type code to unified SessionType
 * @param {string} typeCode - MobaxTerm type code
 * @returns {string} Unified session type
 */
function mapSessionType(typeCode) {
    return MOBA_SESSION_TYPES[typeCode] || SessionType.OTHER;
}

/**
 * Parses a MobaxTerm session line into field values
 * @param {string} nodeLine - Raw session line from INI
 * @returns {Object|null} Parsed fields object or null if invalid
 */
function parseSessionLine(nodeLine) {
    const groups = splitStr(nodeLine, '#');
    if (groups.length < 3) return null;

    const configGroup = splitStr(groups[2], '%');
    if (configGroup.length === 0) return null;

    // Map fields to their values
    const result = FIELDS.reduce((obj, field, index) => {
        obj[field] = configGroup[index] || '';
        return obj;
    }, {});

    return result;
}

/**
 * Converts MobaxTerm parsed fields to a unified session object
 * @param {Object} mobaFields - Parsed MobaxTerm fields
 * @param {string} sessionName - Name of the session (INI key)
 * @param {string} folderPath - Folder path in MobaxTerm
 * @returns {Object} Unified session object
 */
function convertToSession(mobaFields, sessionName, folderPath) {
    const sessionType = mapSessionType(mobaFields.session_type);

    return createSession({
        host: mobaFields.remote_host,
        port: mobaFields.port || '22',
        username: mobaFields.username,
        sessionName: sessionName,
        folderPath: folderPath,
        sessionType: sessionType,
        identityFile: mobaFields.private_key_path,
        forwardAgent: mobaFields.allow_agent_forwarding === '-1',
        x11Forward: mobaFields.x11_fwd === '-1',
        compression: mobaFields.compression === '-1',
        jumpHost: mobaFields.ssh_gateway_host_list,
        jumpPort: mobaFields.ssh_gateway_port_list,
        jumpUser: mobaFields.ssh_gateway_user_list,
        jumpIdentityFile: mobaFields.ssh_gateway_private_key_list,
        command: mobaFields.command,
        sourceFormat: 'mobaxterm'
    });
}

/**
 * Parses a single MobaxTerm INI file
 * @param {string} filePath - Path to the INI file
 * @param {Object} result - Parse result object to populate
 */
function parseFile(filePath, result) {
    const parser = new iniReader.IniReader();
    parser.load(filePath, 'utf8');

    const obj = parser.getBlock();
    let currentFolderPath = '';

    console.log(`Scanning bookmarks in ${path.basename(filePath)}...`);

    for (let key in obj) {
        if (BookmarkLineRex.test(key)) {
            const section = obj[key];
            const childNodeCount = Object.keys(section).length;

            if (childNodeCount === 2) {
                // Empty bookmark section (just SubRep and ImgNum) - folder definition
                console.log('Main group:', currentFolderPath);
                continue;
            }

            // Process sessions in this section
            for (let nodeline in section) {
                if (SubRepLineRex.test(nodeline)) {
                    // Update current folder path
                    currentFolderPath = section[nodeline];
                    console.log('Subgroup:', currentFolderPath);
                    continue;
                }

                if (ImgNumLineRex.test(nodeline)) {
                    continue;
                }

                // This is an actual session entry
                const nodeLine = section[nodeline];
                const mobaFields = parseSessionLine(nodeLine);

                if (!mobaFields) {
                    console.log('Skipping invalid session line:', nodeline);
                    result.stats.other++;
                    continue;
                }

                const sessionType = mapSessionType(mobaFields.session_type);
                result.stats.total++;

                // Update stats by type
                switch (sessionType) {
                    case SessionType.SSH:
                    case SessionType.SFTP:
                        result.stats.ssh++;
                        const session = convertToSession(mobaFields, nodeline, currentFolderPath);
                        result.sessions.push(session);
                        console.log('Found SSH config:', nodeline);
                        break;
                    case SessionType.RDP:
                        result.stats.rdp++;
                        console.log('Skipping RDP config:', nodeline);
                        break;
                    case SessionType.VNC:
                        result.stats.vnc++;
                        console.log('Skipping VNC config:', nodeline);
                        break;
                    default:
                        result.stats.other++;
                        console.log('Skipping unknown config:', nodeline);
                }
            }
        }
    }
}

/**
 * Parses all MobaxTerm INI files in a directory
 * @param {string} dataDir - Directory containing .ini files
 * @returns {Object} Parse result with sessions and statistics
 */
function parse(dataDir) {
    const result = createParseResult();
    result.sourceFormat = 'mobaxterm';

    console.log('Searching for MobaxTerm INI files in:', dataDir);

    const files = fs.readdirSync(dataDir, 'utf8');

    for (const file of files) {
        const ext = path.extname(file).toLowerCase();
        if (ext === '.ini' || ext === '.mxtsessions') {
            console.log('Loading INI content from:', file);
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
 * Checks if a file is a MobaxTerm format file
 * @param {string} filePath - Path to check
 * @returns {boolean} True if MobaxTerm format
 */
function canParse(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    return ext === '.ini' || ext === '.mxtsessions';
}

module.exports = {
    parse,
    canParse,
    parseFile,
    FIELDS
};
