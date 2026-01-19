/**
 * Main library exports
 */

const parsers = require('./parsers');
const generators = require('./generators');
const session = require('./session');

// Backwards compatibility
const sshConfigGenerator = generators.sshconfig;

module.exports = {
    parsers,
    generators,
    sshConfigGenerator,
    session,

    // Convenience exports
    parse: parsers.parse,
    generate: sshConfigGenerator.generate,
    SessionType: session.SessionType,
    createSession: session.createSession
};
