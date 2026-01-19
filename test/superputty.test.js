/**
 * Tests for SuperPutty parser
 * Run with: node test/superputty.test.js
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');

const superputtyParser = require('../lib/parsers/superputty');
const { SessionType } = require('../lib/session');

// Test utilities
let testsPassed = 0;
let testsFailed = 0;

function test(name, fn) {
    try {
        fn();
        console.log(`  ✓ ${name}`);
        testsPassed++;
    } catch (err) {
        console.log(`  ✗ ${name}`);
        console.log(`    Error: ${err.message}`);
        testsFailed++;
    }
}

function describe(name, fn) {
    console.log(`\n${name}`);
    fn();
}

// Create temp directory for test files
const testDataDir = path.join(__dirname, 'temp-data');
if (!fs.existsSync(testDataDir)) {
    fs.mkdirSync(testDataDir, { recursive: true });
}

// ============================================================================
// Test: parseSessionId
// ============================================================================

describe('parseSessionId', () => {
    test('extracts folder path and session name from nested path', () => {
        const result = superputtyParser.parseSessionId('Production/Web Servers/nginx01');
        assert.strictEqual(result.folderPath, 'Production/Web Servers');
        assert.strictEqual(result.sessionName, 'nginx01');
    });

    test('handles single-level path', () => {
        const result = superputtyParser.parseSessionId('myserver');
        assert.strictEqual(result.folderPath, '');
        assert.strictEqual(result.sessionName, 'myserver');
    });

    test('handles two-level path', () => {
        const result = superputtyParser.parseSessionId('Folder/Server');
        assert.strictEqual(result.folderPath, 'Folder');
        assert.strictEqual(result.sessionName, 'Server');
    });

    test('handles empty string', () => {
        const result = superputtyParser.parseSessionId('');
        assert.strictEqual(result.folderPath, '');
        assert.strictEqual(result.sessionName, '');
    });

    test('handles null/undefined', () => {
        const result = superputtyParser.parseSessionId(null);
        assert.strictEqual(result.folderPath, '');
        assert.strictEqual(result.sessionName, '');
    });
});

// ============================================================================
// Test: parseExtraArgs
// ============================================================================

describe('parseExtraArgs', () => {
    test('extracts identity file from -i flag', () => {
        const result = superputtyParser.parseExtraArgs('-i C:\\Keys\\mykey.ppk');
        assert.strictEqual(result.identityFile, 'C:\\Keys\\mykey.ppk');
    });

    test('extracts identity file with quotes', () => {
        const result = superputtyParser.parseExtraArgs('-i "C:\\My Keys\\key.ppk"');
        assert.strictEqual(result.identityFile, 'C:\\My Keys\\key.ppk');
    });

    test('detects agent forwarding (-A)', () => {
        const result = superputtyParser.parseExtraArgs('-A');
        assert.strictEqual(result.forwardAgent, true);
    });

    test('detects X11 forwarding (-X)', () => {
        const result = superputtyParser.parseExtraArgs('-X');
        assert.strictEqual(result.x11Forward, true);
    });

    test('parses multiple flags', () => {
        const result = superputtyParser.parseExtraArgs('-X -A -i /path/to/key.ppk');
        assert.strictEqual(result.forwardAgent, true);
        assert.strictEqual(result.x11Forward, true);
        assert.strictEqual(result.identityFile, '/path/to/key.ppk');
    });

    test('handles empty string', () => {
        const result = superputtyParser.parseExtraArgs('');
        assert.strictEqual(result.identityFile, '');
        assert.strictEqual(result.forwardAgent, false);
        assert.strictEqual(result.x11Forward, false);
    });

    test('handles null/undefined', () => {
        const result = superputtyParser.parseExtraArgs(null);
        assert.strictEqual(result.identityFile, '');
        assert.strictEqual(result.forwardAgent, false);
    });
});

// ============================================================================
// Test: canParse
// ============================================================================

describe('canParse', () => {
    test('returns true for .xml files', () => {
        assert.strictEqual(superputtyParser.canParse('sessions.xml'), true);
        assert.strictEqual(superputtyParser.canParse('Sessions.XML'), true);
        assert.strictEqual(superputtyParser.canParse('/path/to/file.xml'), true);
    });

    test('returns false for non-xml files', () => {
        assert.strictEqual(superputtyParser.canParse('config.ini'), false);
        assert.strictEqual(superputtyParser.canParse('file.txt'), false);
        assert.strictEqual(superputtyParser.canParse('file.mxtsessions'), false);
    });
});

// ============================================================================
// Test: parse (full XML parsing)
// ============================================================================

describe('parse (XML file parsing)', () => {
    // Create test XML file
    const testXmlPath = path.join(testDataDir, 'test-sessions.xml');
    const testXmlContent = `<?xml version="1.0" encoding="utf-8"?>
<ArrayOfSessionData>
  <SessionData SessionId="Production/web01" SessionName="web01" Host="192.168.1.10" Port="22" Proto="SSH" Username="admin" ExtraArgs="-A" Note="Web server" />
  <SessionData SessionId="Production/web02" SessionName="web02" Host="192.168.1.11" Port="2222" Proto="SSH2" Username="root" ExtraArgs="-i /keys/id_rsa" Note="" />
  <SessionData SessionId="Database/mysql" SessionName="mysql" Host="192.168.1.20" Port="22" Proto="SSH" Username="dbadmin" ExtraArgs="" Note="MySQL server" />
  <SessionData SessionId="Legacy/switch01" SessionName="switch01" Host="192.168.100.1" Port="23" Proto="Telnet" Username="" ExtraArgs="" Note="Network switch" />
  <SessionData SessionId="Windows/desktop" SessionName="desktop" Host="192.168.1.50" Port="3389" Proto="RDP" Username="user" ExtraArgs="" Note="Workstation" />
  <SessionData SessionId="Monitoring/vnc-server" SessionName="vnc-server" Host="192.168.1.60" Port="5900" Proto="VNC" Username="" ExtraArgs="" Note="VNC" />
</ArrayOfSessionData>`;

    fs.writeFileSync(testXmlPath, testXmlContent);

    test('parses XML file and returns correct session count', () => {
        const result = superputtyParser.parse(testDataDir);
        // Should have 3 SSH sessions (web01, web02, mysql)
        assert.strictEqual(result.sessions.length, 3);
    });

    test('correctly identifies source format', () => {
        const result = superputtyParser.parse(testDataDir);
        assert.strictEqual(result.sourceFormat, 'superputty');
    });

    test('tracks statistics correctly', () => {
        const result = superputtyParser.parse(testDataDir);
        assert.strictEqual(result.stats.ssh, 3);      // web01, web02, mysql
        assert.strictEqual(result.stats.rdp, 1);      // desktop
        assert.strictEqual(result.stats.vnc, 1);      // vnc-server
        assert.strictEqual(result.stats.telnet, 1);   // switch01
        assert.strictEqual(result.stats.total, 6);
    });

    test('parses SSH session properties correctly', () => {
        const result = superputtyParser.parse(testDataDir);
        const web01 = result.sessions.find(s => s.sessionName === 'web01');

        assert.ok(web01, 'web01 session should exist');
        assert.strictEqual(web01.host, '192.168.1.10');
        assert.strictEqual(web01.port, '22');
        assert.strictEqual(web01.username, 'admin');
        assert.strictEqual(web01.folderPath, 'Production');
        assert.strictEqual(web01.sessionType, SessionType.SSH);
        assert.strictEqual(web01.forwardAgent, true);  // -A flag
        assert.strictEqual(web01.sourceFormat, 'superputty');
    });

    test('parses SSH2 protocol as SSH', () => {
        const result = superputtyParser.parse(testDataDir);
        const web02 = result.sessions.find(s => s.sessionName === 'web02');

        assert.ok(web02, 'web02 session should exist');
        assert.strictEqual(web02.sessionType, SessionType.SSH);
        assert.strictEqual(web02.port, '2222');
        assert.strictEqual(web02.identityFile, '/keys/id_rsa');
    });

    test('extracts identity file from ExtraArgs', () => {
        const result = superputtyParser.parse(testDataDir);
        const web02 = result.sessions.find(s => s.sessionName === 'web02');

        assert.strictEqual(web02.identityFile, '/keys/id_rsa');
    });

    // Cleanup
    fs.unlinkSync(testXmlPath);
});

// ============================================================================
// Test: Edge cases
// ============================================================================

describe('Edge cases', () => {
    test('handles empty XML file gracefully', () => {
        const emptyXmlPath = path.join(testDataDir, 'empty.xml');
        fs.writeFileSync(emptyXmlPath, `<?xml version="1.0"?><ArrayOfSessionData></ArrayOfSessionData>`);

        const result = superputtyParser.parse(testDataDir);
        assert.strictEqual(result.sessions.length, 0);
        assert.strictEqual(result.stats.total, 0);

        fs.unlinkSync(emptyXmlPath);
    });

    test('handles single session (not array)', () => {
        const singleXmlPath = path.join(testDataDir, 'single.xml');
        fs.writeFileSync(singleXmlPath, `<?xml version="1.0"?>
<ArrayOfSessionData>
  <SessionData SessionId="server1" SessionName="server1" Host="10.0.0.1" Port="22" Proto="SSH" Username="user" />
</ArrayOfSessionData>`);

        const result = superputtyParser.parse(testDataDir);
        assert.strictEqual(result.sessions.length, 1);
        assert.strictEqual(result.sessions[0].host, '10.0.0.1');

        fs.unlinkSync(singleXmlPath);
    });

    test('handles missing optional attributes', () => {
        const minimalXmlPath = path.join(testDataDir, 'minimal.xml');
        fs.writeFileSync(minimalXmlPath, `<?xml version="1.0"?>
<ArrayOfSessionData>
  <SessionData SessionId="minimal" Host="example.com" Proto="SSH" />
</ArrayOfSessionData>`);

        const result = superputtyParser.parse(testDataDir);
        assert.strictEqual(result.sessions.length, 1);

        const session = result.sessions[0];
        assert.strictEqual(session.host, 'example.com');
        assert.strictEqual(session.port, '22');  // default
        assert.strictEqual(session.username, '');  // empty default

        fs.unlinkSync(minimalXmlPath);
    });

    test('handles directory with no XML files', () => {
        const emptyDir = path.join(testDataDir, 'empty-subdir');
        if (!fs.existsSync(emptyDir)) {
            fs.mkdirSync(emptyDir);
        }

        const result = superputtyParser.parse(emptyDir);
        assert.strictEqual(result.sessions.length, 0);

        fs.rmdirSync(emptyDir);
    });
});

// ============================================================================
// Cleanup and summary
// ============================================================================

// Remove temp directory
try {
    fs.rmdirSync(testDataDir);
} catch (e) {
    // Directory might not be empty or already removed
}

console.log('\n' + '='.repeat(50));
console.log(`Tests: ${testsPassed} passed, ${testsFailed} failed`);
console.log('='.repeat(50));

process.exit(testsFailed > 0 ? 1 : 0);
