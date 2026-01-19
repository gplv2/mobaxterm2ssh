/**
 * SSH Config Generator
 * Converts unified session objects to OpenSSH config format
 */

const fs = require('fs');
const path = require('path');
const util = require('util');
const SSHConfig = require('ssh-config');

/**
 * Creates a backup copy of a file with datetime appended
 * @param {string} filename - File to backup
 */
function backupFile(filename) {
    if (!fs.existsSync(filename)) {
        console.log(`File ${filename} does not exist. Not taking backup copy.`);
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
 * Builds a ProxyJump string from jump host settings
 * @param {Object} session - Session object with jump host settings
 * @returns {string} ProxyJump value or empty string
 */
function buildProxyJump(session) {
    if (!session.jumpHost || session.jumpHost.length === 0) {
        return '';
    }

    const user = session.jumpUser || session.username || '';
    const host = session.jumpHost;
    const port = session.jumpPort || '22';

    if (user) {
        return util.format('%s@%s:%s', user, host, port);
    }
    return util.format('%s:%s', host, port);
}

/**
 * Converts a unified session to SSH config entry format
 * @param {Object} session - Unified session object
 * @param {Object} options - Generation options
 * @returns {Object} SSH config entry object
 */
function sessionToConfigEntry(session, options = {}) {
    const proxyJump = buildProxyJump(session);

    const entry = {
        '### ': session.folderPath || '',
        '#': session.sessionName || '',
        Host: session.host.toLowerCase(),
        Port: session.port || '22',
        HostName: session.host.toLowerCase(),
        User: session.username || 'nobody'
    };

    // Add ProxyJump only if we have a jump host
    if (proxyJump) {
        entry.ProxyJump = proxyJump;
    }

    // Add IdentityFile - prefer jump identity file, fall back to session identity file
    const identityFile = session.jumpIdentityFile || session.identityFile;
    if (identityFile) {
        entry.IdentityFile = identityFile;
    } else {
        entry.IdentityFile = '~/.ssh/id_ed25519';
    }

    // Add ForwardAgent if enabled
    if (session.forwardAgent) {
        entry.ForwardAgent = 'yes';
    }

    return entry;
}

/**
 * Applies username replacement to sessions
 * @param {Object[]} sessions - Array of session objects
 * @param {string} replaceUser - Replace spec in "old/new" format
 * @returns {Object[]} Sessions with replaced usernames
 */
function applyUserReplacement(sessions, replaceUser) {
    if (!replaceUser || !replaceUser.includes('/')) {
        return sessions;
    }

    const [oldUsername, newUsername] = replaceUser.split('/');

    return sessions.map(session => {
        const updated = { ...session };

        if (session.username === oldUsername) {
            updated.username = newUsername;
            console.log(`Username replaced: ${oldUsername} -> ${newUsername}`);
        }

        if (session.jumpUser === oldUsername) {
            updated.jumpUser = newUsername;
            console.log(`Jump user replaced: ${oldUsername} -> ${newUsername}`);
        }

        return updated;
    });
}

/**
 * Removes empty ProxyJump entries from config
 * @param {Object} config - SSH config object
 */
function cleanEmptyProxyJumps(config) {
    const keysToCheck = ['ProxyJump'];

    config.forEach((host) => {
        if (Array.isArray(host.config)) {
            host.config = host.config.filter(entry => {
                if (keysToCheck.includes(entry.param)) {
                    return entry.value && entry.value.trim() !== '';
                }
                return true;
            });
        }
    });
}

/**
 * Generates SSH config from sessions
 * @param {Object[]} sessions - Array of unified session objects
 * @param {Object} options - Generation options
 * @param {string} options.sshConfigFile - Path to existing SSH config (to merge with)
 * @param {string} options.outputFile - Path to write output
 * @param {string} options.replaceUser - Username replacement in "old/new" format
 * @param {boolean} options.backup - Whether to backup existing file (default: true)
 */
function generate(sessions, options = {}) {
    const sshConfigFile = options.sshConfigFile;
    const outputFile = options.outputFile || sshConfigFile;
    const shouldBackup = options.backup !== false;

    console.log('Loading SSH config file:', sshConfigFile);
    console.log('Will write output to:', outputFile);

    // Load existing config or create empty one
    let config;
    try {
        if (fs.existsSync(sshConfigFile)) {
            const fileContent = fs.readFileSync(sshConfigFile, 'utf8');
            config = SSHConfig.parse(fileContent);
        } else {
            config = SSHConfig.parse('');
        }
    } catch (err) {
        console.error('Error reading SSH config file:', err.message);
        config = SSHConfig.parse('');
    }

    // Apply username replacement if specified
    let processedSessions = sessions;
    if (options.replaceUser) {
        processedSessions = applyUserReplacement(sessions, options.replaceUser);
    }

    // Generate config entries for each session
    processedSessions.forEach((session, index) => {
        console.log(`Generating host config ${index + 1}: ${session.host}`);
        const entry = sessionToConfigEntry(session, options);
        config.prepend(entry);
    });

    // Clean up empty ProxyJump entries
    cleanEmptyProxyJumps(config);

    // Backup and write
    try {
        if (shouldBackup) {
            backupFile(outputFile);
        }

        fs.writeFileSync(outputFile, SSHConfig.stringify(config));
        console.log('SSH config written successfully');
    } catch (err) {
        console.error('Error writing SSH config:', err.message);
        throw err;
    }
}

module.exports = {
    generate,
    sessionToConfigEntry,
    applyUserReplacement,
    buildProxyJump,
    backupFile
};
