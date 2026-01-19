/**
 * Tests for SuperPutty XML generator
 * Run with: node test/superputty-generator.test.js
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');

const superputtyGenerator = require('../lib/generators/superputty');
const { createSession, SessionType } = require('../lib/session');

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
const testDataDir = path.join(__dirname, 'temp-generator-data');
if (!fs.existsSync(testDataDir)) {
    fs.mkdirSync(testDataDir, { recursive: true });
}

// ============================================================================
// Test: escapeXml
// ============================================================================

describe('escapeXml', () => {
    test('escapes ampersand', () => {
        assert.strictEqual(superputtyGenerator.escapeXml('foo & bar'), 'foo &amp; bar');
    });

    test('escapes less than', () => {
        assert.strictEqual(superputtyGenerator.escapeXml('a < b'), 'a &lt; b');
    });

    test('escapes greater than', () => {
        assert.strictEqual(superputtyGenerator.escapeXml('a > b'), 'a &gt; b');
    });

    test('escapes double quotes', () => {
        assert.strictEqual(superputtyGenerator.escapeXml('say "hello"'), 'say &quot;hello&quot;');
    });

    test('escapes single quotes', () => {
        assert.strictEqual(superputtyGenerator.escapeXml("it's"), 'it&apos;s');
    });

    test('handles empty string', () => {
        assert.strictEqual(superputtyGenerator.escapeXml(''), '');
    });

    test('handles null/undefined', () => {
        assert.strictEqual(superputtyGenerator.escapeXml(null), '');
        assert.strictEqual(superputtyGenerator.escapeXml(undefined), '');
    });
});

// ============================================================================
// Test: buildSessionId
// ============================================================================

describe('buildSessionId', () => {
    test('combines folder path and session name', () => {
        const session = createSession({
            folderPath: 'Production/Web',
            sessionName: 'nginx01'
        });
        assert.strictEqual(superputtyGenerator.buildSessionId(session), 'Production/Web/nginx01');
    });

    test('converts backslashes to forward slashes', () => {
        const session = createSession({
            folderPath: 'Production\\Database',
            sessionName: 'mysql'
        });
        assert.strictEqual(superputtyGenerator.buildSessionId(session), 'Production/Database/mysql');
    });

    test('uses host as name when sessionName is empty', () => {
        const session = createSession({
            folderPath: 'Servers',
            host: '192.168.1.10'
        });
        assert.strictEqual(superputtyGenerator.buildSessionId(session), 'Servers/192.168.1.10');
    });

    test('handles empty folder path', () => {
        const session = createSession({
            sessionName: 'standalone'
        });
        assert.strictEqual(superputtyGenerator.buildSessionId(session), 'standalone');
    });
});

// ============================================================================
// Test: buildExtraArgs
// ============================================================================

describe('buildExtraArgs', () => {
    test('adds -i for identity file', () => {
        const session = createSession({
            identityFile: '/path/to/key.ppk'
        });
        assert.strictEqual(superputtyGenerator.buildExtraArgs(session), '-i /path/to/key.ppk');
    });

    test('quotes identity file path with spaces', () => {
        const session = createSession({
            identityFile: 'C:\\My Keys\\key.ppk'
        });
        assert.strictEqual(superputtyGenerator.buildExtraArgs(session), '-i "C:\\My Keys\\key.ppk"');
    });

    test('adds -A for agent forwarding', () => {
        const session = createSession({
            forwardAgent: true
        });
        assert.strictEqual(superputtyGenerator.buildExtraArgs(session), '-A');
    });

    test('adds -X for X11 forwarding', () => {
        const session = createSession({
            x11Forward: true
        });
        assert.strictEqual(superputtyGenerator.buildExtraArgs(session), '-X');
    });

    test('combines multiple flags', () => {
        const session = createSession({
            identityFile: '/key.ppk',
            forwardAgent: true,
            x11Forward: true
        });
        assert.strictEqual(superputtyGenerator.buildExtraArgs(session), '-i /key.ppk -A -X');
    });

    test('returns empty string when no flags', () => {
        const session = createSession({});
        assert.strictEqual(superputtyGenerator.buildExtraArgs(session), '');
    });
});

// ============================================================================
// Test: sessionToXml
// ============================================================================

describe('sessionToXml', () => {
    test('generates valid XML element', () => {
        const session = createSession({
            host: '192.168.1.10',
            port: '22',
            username: 'admin',
            sessionName: 'webserver',
            folderPath: 'Production',
            sessionType: SessionType.SSH
        });

        const xml = superputtyGenerator.sessionToXml(session);

        assert.ok(xml.includes('SessionId="Production/webserver"'));
        assert.ok(xml.includes('SessionName="webserver"'));
        assert.ok(xml.includes('Host="192.168.1.10"'));
        assert.ok(xml.includes('Port="22"'));
        assert.ok(xml.includes('Proto="SSH"'));
        assert.ok(xml.includes('Username="admin"'));
        assert.ok(xml.includes('PuttySession="Default Settings"'));
    });

    test('escapes special characters in values', () => {
        const session = createSession({
            host: 'server.example.com',
            sessionName: 'Test & Dev <staging>',
            username: 'user"name'
        });

        const xml = superputtyGenerator.sessionToXml(session);

        assert.ok(xml.includes('SessionName="Test &amp; Dev &lt;staging&gt;"'));
        assert.ok(xml.includes('Username="user&quot;name"'));
    });

    test('includes ExtraArgs from session settings', () => {
        const session = createSession({
            host: 'server.example.com',
            forwardAgent: true,
            x11Forward: true
        });

        const xml = superputtyGenerator.sessionToXml(session);

        assert.ok(xml.includes('ExtraArgs="-A -X"'));
    });
});

// ============================================================================
// Test: generateXml
// ============================================================================

describe('generateXml', () => {
    test('generates complete XML document', () => {
        const sessions = [
            createSession({
                host: '192.168.1.10',
                sessionName: 'server1',
                username: 'admin'
            }),
            createSession({
                host: '192.168.1.11',
                sessionName: 'server2',
                username: 'root'
            })
        ];

        const xml = superputtyGenerator.generateXml(sessions);

        assert.ok(xml.includes('<?xml version="1.0" encoding="utf-8"?>'));
        assert.ok(xml.includes('<ArrayOfSessionData'));
        assert.ok(xml.includes('</ArrayOfSessionData>'));
        assert.ok(xml.includes('SessionName="server1"'));
        assert.ok(xml.includes('SessionName="server2"'));
    });

    test('handles empty sessions array', () => {
        const xml = superputtyGenerator.generateXml([]);

        assert.ok(xml.includes('<?xml version="1.0" encoding="utf-8"?>'));
        assert.ok(xml.includes('<ArrayOfSessionData'));
        assert.ok(xml.includes('</ArrayOfSessionData>'));
    });
});

// ============================================================================
// Test: generate (file output)
// ============================================================================

describe('generate (file output)', () => {
    test('writes XML file', () => {
        const sessions = [
            createSession({
                host: '10.0.0.1',
                sessionName: 'test-server',
                username: 'testuser',
                folderPath: 'Test'
            })
        ];

        const outputFile = path.join(testDataDir, 'output.xml');

        superputtyGenerator.generate(sessions, {
            outputFile: outputFile,
            backup: false
        });

        assert.ok(fs.existsSync(outputFile));

        const content = fs.readFileSync(outputFile, 'utf8');
        assert.ok(content.includes('SessionName="test-server"'));
        assert.ok(content.includes('Host="10.0.0.1"'));

        fs.unlinkSync(outputFile);
    });

    test('creates backup of existing file', () => {
        const outputFile = path.join(testDataDir, 'backup-test.xml');

        // Create initial file
        fs.writeFileSync(outputFile, '<original/>');

        const sessions = [
            createSession({ host: '10.0.0.1', sessionName: 'new' })
        ];

        superputtyGenerator.generate(sessions, {
            outputFile: outputFile,
            backup: true
        });

        // Check backup was created
        const files = fs.readdirSync(testDataDir);
        const backupFiles = files.filter(f => f.startsWith('backup-test-') && f.endsWith('.xml'));
        assert.ok(backupFiles.length > 0, 'Backup file should exist');

        // Cleanup
        fs.unlinkSync(outputFile);
        backupFiles.forEach(f => fs.unlinkSync(path.join(testDataDir, f)));
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
