/**
 * Main library exports
 */

const parsers = require('./parsers');
const sshConfigGenerator = require('./generators/sshconfig');
const session = require('./session');

module.exports = {
    parsers,
    sshConfigGenerator,
    session,

    // Convenience exports
    parse: parsers.parse,
    generate: sshConfigGenerator.generate,
    SessionType: session.SessionType,
    createSession: session.createSession
};
