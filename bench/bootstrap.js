#!/usr/bin/env node
/**
 * Checks the bootstrap definition against the disk, run from the repository root:
 *
 *   node bench/bootstrap.js
 *
 * Every file served from website/ is declared in js/libBootstrap.json (the shell precached by the service worker
 * aside), every declared file exists, and every class is declared after the class it extends (a file before those
 * that use it at load time). Exits with 1 on a failure.
 */

const fs   = require('fs');
const path = require('path');

const WEBSITE_DIR = path.resolve(__dirname, '..', 'website');
const DEFINITION  = 'js/libBootstrap.json';
// Served without a declaration: the shell precached by the service worker, the icons, the definition, the licences.
const UNDECLARED  = [
    /^index\.html$/, /^manifest\.webmanifest$/, /^appServiceWorker\.js$/, /^ping\.json$/, /^favicon\.ico$/,
    /^apple-touch-icon\.png$/, /^browserconfig\.xml$/, /^icon\//, /^css\/main\.css$/, /^js\/webapp\/appBootstrap\.js$/,
    /^js\/libBootstrap\.json$/, /\.md$/
];

class BootstrapBench {
    constructor() {
        this._failures = 0;
    }

    run() {
        const files    = Object.values(JSON.parse(this._read(DEFINITION)).files).flat().map((file) => file.replace(/^\//, ''));
        const declared = new Set(files);

        this._list('served but not declared', BootstrapBench._walk('').filter((file) => (!declared.has(file) && !UNDECLARED.some((pattern) => pattern.test(file)))));
        this._list('declared but missing', files.filter((file) => !fs.existsSync(path.join(WEBSITE_DIR, file))));
        this._list('declared twice', files.filter((file, index) => (files.indexOf(file) !== index)));
        this._list('classes declared before the class they extend', this._lateParents(files.filter((file) => file.endsWith('.js'))));
        console.log((this._failures === 0) ? 'bootstrap: all checks passed' : ('bootstrap: ' + this._failures + ' check(s) failed'));

        return this._failures;
    }

    _lateParents(scripts) {
        const declaredIn = new Map();
        const late       = [];
        scripts.forEach((file, index) => {
            for (const match of this._read(file).matchAll(/^class (\w+)/gm)) {
                declaredIn.set(match[1], index);
            }
        });
        scripts.forEach((file, index) => {
            for (const match of this._read(file).matchAll(/^class \w+ extends (\w+)/gm)) {
                if ((declaredIn.get(match[1]) ?? -1) > index) {
                    late.push(file + ' extends ' + match[1] + ', declared after it');
                }
            }
        });

        return late;
    }

    _list(label, offenders) {
        const ok = (offenders.length === 0);
        if (!ok) {
            this._failures++;
        }
        console.log((ok ? '  ok   ' : '  FAIL ') + label + (ok ? ': none' : (':\n         ' + offenders.join('\n         '))));
    }

    _read(file) {
        return fs.readFileSync(path.join(WEBSITE_DIR, file), 'utf8');
    }

    static _walk(dir) {
        return fs.readdirSync(path.join(WEBSITE_DIR, dir), {withFileTypes: true})
            .flatMap((entry) => {
                const relative = ((dir === '') ? entry.name : (dir + '/' + entry.name));

                return (entry.isDirectory() ? BootstrapBench._walk(relative) : [relative]);
            })
            .sort();
    }
}

process.exit((new BootstrapBench().run() === 0) ? 0 : 1);
