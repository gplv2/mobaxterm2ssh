/**
 * Tests for MobaxTerm parser
 * Run with: node test/mobaxterm.test.js
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');

const mobaxtermParser = require('../lib/parsers/mobaxterm');
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
const testDataDir = path.join(__dirname, 'temp-moba-data');
if (!fs.existsSync(testDataDir)) {
    fs.mkdirSync(testDataDir, { recursive: true });
}

// ============================================================================
// Test: canParse
// ============================================================================

describe('canParse', () => {
    test('returns true for .ini files', () => {
        assert.strictEqual(mobaxtermParser.canParse('config.ini'), true);
        assert.strictEqual(mobaxtermParser.canParse('MobaXterm.INI'), true);
        assert.strictEqual(mobaxtermParser.canParse('/path/to/file.ini'), true);
    });

    test('returns true for .mxtsessions files', () => {
        assert.strictEqual(mobaxtermParser.canParse('sessions.mxtsessions'), true);
        assert.strictEqual(mobaxtermParser.canParse('export.MXTSESSIONS'), true);
    });

    test('returns false for non-ini files', () => {
        assert.strictEqual(mobaxtermParser.canParse('sessions.xml'), false);
        assert.strictEqual(mobaxtermParser.canParse('file.txt'), false);
        assert.strictEqual(mobaxtermParser.canParse('config.json'), false);
    });
});

// ============================================================================
// Test: FIELDS constant
// ============================================================================

describe('FIELDS constant', () => {
    test('has correct number of fields', () => {
        assert.strictEqual(mobaxtermParser.FIELDS.length, 35);
    });

    test('has expected field names at correct positions', () => {
        assert.strictEqual(mobaxtermParser.FIELDS[0], 'session_type');
        assert.strictEqual(mobaxtermParser.FIELDS[1], 'remote_host');
        assert.strictEqual(mobaxtermParser.FIELDS[2], 'port');
        assert.strictEqual(mobaxtermParser.FIELDS[3], 'username');
        assert.strictEqual(mobaxtermParser.FIELDS[8], 'ssh_gateway_host_list');
        assert.strictEqual(mobaxtermParser.FIELDS[34], 'allow_agent_forwarding');
    });
});

// ============================================================================
// Test: parse (full INI parsing)
// ============================================================================

describe('parse (INI file parsing)', () => {
    // Create test INI file matching MobaxTerm format
    const testIniPath = path.join(testDataDir, 'test-moba.ini');
    const testIniContent = `[Bookmarks]
SubRep=
ImgNum=42

[Bookmarks_1]
SubRep=Production
ImgNum=41
webserver1=#109#0%192.168.1.10%22%admin%%0%0%%%%%0%0%0%%%-1%0%0%0%%1080%%0%0%1%#MobaFont%10%0%0%-1%15%236,236,236%30,30,30%180,180,192%0%-1%0%%xterm%-1%0%_Std_Colors_0_%80%24%0%0%-1%<none>%%0%0%-1%-1#0# #-1
webserver2=#109#0%192.168.1.11%2222%root%%0%0%%%%%0%0%0%%%-1%0%0%0%%1080%%0%0%1%#MobaFont%10%0%0%-1%15%236,236,236%30,30,30%180,180,192%0%-1%0%%xterm%-1%0%_Std_Colors_0_%80%24%0%0%-1%<none>%%0%0%-1%-1#0# #-1

[Bookmarks_2]
SubRep=Production\\Database
ImgNum=41
mysql=#109#0%192.168.1.20%22%dbadmin%%0%0%%%%%0%0%0%%%-1%0%0%0%%1080%%0%0%1%#MobaFont%10%0%0%-1%15%236,236,236%30,30,30%180,180,192%0%-1%0%%xterm%-1%0%_Std_Colors_0_%80%24%0%0%-1%<none>%%0%0%-1%-1#0# #-1

[Bookmarks_3]
SubRep=Windows
ImgNum=41
rdp-desktop=#91#4%192.168.1.50%3389%user%%0%0%%%%%0%0%0%%%-1%0%0%0%%1080%%0%0%1%#MobaFont%10%0%0%-1%15%236,236,236%30,30,30%180,180,192%0%-1%0%%xterm%-1%0%_Std_Colors_0_%80%24%0%0%-1%<none>%%0%0%-1%-1#0# #-1
`;

    fs.writeFileSync(testIniPath, testIniContent);

    test('parses INI file and returns correct SSH session count', () => {
        const result = mobaxtermParser.parse(testDataDir);
        // Should have 3 SSH sessions (webserver1, webserver2, mysql)
        assert.strictEqual(result.sessions.length, 3);
    });

    test('correctly identifies source format', () => {
        const result = mobaxtermParser.parse(testDataDir);
        assert.strictEqual(result.sourceFormat, 'mobaxterm');
    });

    test('tracks statistics correctly', () => {
        const result = mobaxtermParser.parse(testDataDir);
        assert.strictEqual(result.stats.ssh, 3);      // webserver1, webserver2, mysql
        assert.strictEqual(result.stats.rdp, 1);      // rdp-desktop
        assert.strictEqual(result.stats.total, 4);
    });

    test('parses SSH session properties correctly', () => {
        const result = mobaxtermParser.parse(testDataDir);
        const webserver1 = result.sessions.find(s => s.sessionName === 'webserver1');

        assert.ok(webserver1, 'webserver1 session should exist');
        assert.strictEqual(webserver1.host, '192.168.1.10');
        assert.strictEqual(webserver1.port, '22');
        assert.strictEqual(webserver1.username, 'admin');
        assert.strictEqual(webserver1.sessionType, SessionType.SSH);
        assert.strictEqual(webserver1.sourceFormat, 'mobaxterm');
    });

    test('parses custom port correctly', () => {
        const result = mobaxtermParser.parse(testDataDir);
        const webserver2 = result.sessions.find(s => s.sessionName === 'webserver2');

        assert.ok(webserver2, 'webserver2 session should exist');
        assert.strictEqual(webserver2.port, '2222');
        assert.strictEqual(webserver2.username, 'root');
    });

    test('preserves folder path', () => {
        const result = mobaxtermParser.parse(testDataDir);
        const mysql = result.sessions.find(s => s.sessionName === 'mysql');

        assert.ok(mysql, 'mysql session should exist');
        assert.strictEqual(mysql.folderPath, 'Production\\Database');
    });

    // Cleanup
    fs.unlinkSync(testIniPath);
});

// ============================================================================
// Test: Session with jump host
// ============================================================================

describe('Session with jump host', () => {
    const jumpIniPath = path.join(testDataDir, 'jump-test.ini');
    // Session with gateway settings (fields 8, 9, 10 are gateway host, port, user)
    const jumpIniContent = `[Bookmarks]
SubRep=
ImgNum=42

[Bookmarks_1]
SubRep=Secure
ImgNum=41
internal-server=#109#0%10.0.0.100%22%user%%0%0%%bastion.example.com%22%jumpuser%0%0%0%%%-1%0%0%0%%1080%%0%0%1%#MobaFont%10%0%0%-1%15%236,236,236%30,30,30%180,180,192%0%-1%0%%xterm%-1%0%_Std_Colors_0_%80%24%0%0%-1%<none>%%0%0%-1%-1#0# #-1
`;

    fs.writeFileSync(jumpIniPath, jumpIniContent);

    test('extracts jump host settings', () => {
        const result = mobaxtermParser.parse(testDataDir);
        const internal = result.sessions.find(s => s.sessionName === 'internal-server');

        assert.ok(internal, 'internal-server session should exist');
        assert.strictEqual(internal.jumpHost, 'bastion.example.com');
        assert.strictEqual(internal.jumpPort, '22');
        assert.strictEqual(internal.jumpUser, 'jumpuser');
    });

    fs.unlinkSync(jumpIniPath);
});

// ============================================================================
// Test: Edge cases
// ============================================================================

describe('Edge cases', () => {
    test('handles directory with no INI files', () => {
        const emptyDir = path.join(testDataDir, 'empty-subdir');
        if (!fs.existsSync(emptyDir)) {
            fs.mkdirSync(emptyDir);
        }

        const result = mobaxtermParser.parse(emptyDir);
        assert.strictEqual(result.sessions.length, 0);

        fs.rmdirSync(emptyDir);
    });

    test('handles INI file with only folders (no sessions)', () => {
        const foldersOnlyPath = path.join(testDataDir, 'folders-only.ini');
        fs.writeFileSync(foldersOnlyPath, `[Bookmarks]
SubRep=
ImgNum=42

[Bookmarks_1]
SubRep=Empty Folder
ImgNum=41
`);

        const result = mobaxtermParser.parse(testDataDir);
        assert.strictEqual(result.sessions.length, 0);

        fs.unlinkSync(foldersOnlyPath);
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
