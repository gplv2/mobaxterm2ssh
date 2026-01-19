/**
 * Common session model - unified representation for sessions from any source format
 * (MobaxTerm, SuperPutty, etc.)
 */

/**
 * Session types that can be converted to SSH config
 */
const SessionType = {
    SSH: 'ssh',
    SFTP: 'sftp',
    // Non-SSH types (for statistics/filtering)
    RDP: 'rdp',
    VNC: 'vnc',
    TELNET: 'telnet',
    SERIAL: 'serial',
    OTHER: 'other'
};

/**
 * Creates a normalized session object from parsed data
 * @param {Object} data - Session data from a parser
 * @returns {Object} Normalized session object
 */
function createSession(data) {
    return {
        // Core connection settings
        host: data.host || '',
        port: data.port || '22',
        username: data.username || '',

        // Session metadata
        sessionName: data.sessionName || '',
        folderPath: data.folderPath || '',
        sessionType: data.sessionType || SessionType.SSH,

        // SSH-specific settings
        identityFile: data.identityFile || '',
        forwardAgent: data.forwardAgent || false,
        x11Forward: data.x11Forward || false,
        compression: data.compression || false,

        // Jump host / proxy settings
        jumpHost: data.jumpHost || '',
        jumpPort: data.jumpPort || '',
        jumpUser: data.jumpUser || '',
        jumpIdentityFile: data.jumpIdentityFile || '',

        // Additional settings
        command: data.command || '',
        note: data.note || '',

        // Source tracking (for debugging)
        sourceFormat: data.sourceFormat || 'unknown'
    };
}

/**
 * Checks if a session type should be converted to SSH config
 * @param {string} sessionType - The session type
 * @returns {boolean} True if convertible to SSH config
 */
function isSSHConvertible(sessionType) {
    return sessionType === SessionType.SSH || sessionType === SessionType.SFTP;
}

/**
 * Result object from a parser containing sessions and statistics
 */
function createParseResult() {
    return {
        sessions: [],
        stats: {
            ssh: 0,
            rdp: 0,
            vnc: 0,
            telnet: 0,
            other: 0,
            total: 0
        },
        sourceFormat: 'unknown',
        errors: []
    };
}

module.exports = {
    SessionType,
    createSession,
    isSSHConvertible,
    createParseResult
};
