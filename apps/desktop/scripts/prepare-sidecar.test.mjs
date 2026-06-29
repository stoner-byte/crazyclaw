import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { sidecarBinaryName, targetTripleFromRustcVersion } from './prepare-sidecar.mjs';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const srcTauriDir = join(scriptDir, '..', 'src-tauri');

describe('prepare-sidecar helpers', () => {
  it('extracts target triple from rustc -vV output', () => {
    const output = [
      'rustc 1.88.0 (6b00bc388 2025-06-23)',
      'binary: rustc',
      'commit-hash: 6b00bc3880198600130e1cf62b8f8a93494488cc',
      'host: aarch64-apple-darwin',
      'release: 1.88.0',
      'LLVM version: 20.1.5',
    ].join('\n');

    assert.equal(targetTripleFromRustcVersion(output), 'aarch64-apple-darwin');
  });

  it('adds exe suffix before target triple on Windows', () => {
    assert.equal(
      sidecarBinaryName('crazyclaw-node', 'x86_64-pc-windows-msvc'),
      'crazyclaw-node-x86_64-pc-windows-msvc.exe',
    );
  });

  it('does not expose the server sidecar to WebView shell calls', () => {
    const capability = JSON.parse(
      readFileSync(join(srcTauriDir, 'capabilities', 'default.json'), 'utf8'),
    );
    const permissions = JSON.stringify(capability.permissions);

    assert.equal(permissions.includes('shell:allow-spawn'), false);
    assert.equal(permissions.includes('binaries/crazyclaw-node'), false);
  });
});
