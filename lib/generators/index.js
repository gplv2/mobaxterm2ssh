/**
 * Generator registry
 */

const sshconfig = require('./sshconfig');
const superputty = require('./superputty');

const generators = {
    sshconfig,
    superputty
};

/**
 * Gets a generator by output format name
 * @param {string} format - Output format: 'sshconfig' or 'superputty'
 * @returns {Object} Generator module
 */
function getGenerator(format) {
    return generators[format];
}

/**
 * Lists available output format names
 * @returns {string[]} Array of format names
 */
function listFormats() {
    return Object.keys(generators);
}

module.exports = {
    sshconfig,
    superputty,
    generators,
    getGenerator,
    listFormats
};
