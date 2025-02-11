const esbuild = require('esbuild');

esbuild.build({
    entryPoints: ['main.ts'],
    bundle: true,
    outfile: 'main.js',
    external: ['obsidian'],
    format: 'cjs',
    watch: false,
    target: 'es2018',
    logLevel: 'info',
    sourcemap: 'inline',
    treeShaking: true,
}).catch(() => process.exit(1));
