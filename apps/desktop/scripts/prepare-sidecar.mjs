import { execFileSync, spawnSync } from 'node:child_process';
import { chmodSync, copyFileSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const desktopDir = join(scriptDir, '..');
const repoRoot = join(desktopDir, '..', '..');
const srcTauriDir = join(desktopDir, 'src-tauri');
const serverResourceDir = join(srcTauriDir, 'resources', 'server');
const binariesDir = join(srcTauriDir, 'binaries');
const sidecarBaseName = 'crazyclaw-node';

// 从 rustc -vV 输出中解析当前平台的 Rust target triple，供 Tauri sidecar 命名使用。
export function targetTripleFromRustcVersion(output) {
  const hostLine = output
    .split('\n')
    .find((line) => line.startsWith('host: '));
  if (!hostLine) {
    throw new Error('Could not find host target in rustc -vV output');
  }
  return hostLine.slice('host: '.length).trim();
}

// 生成符合 Tauri 约定的 sidecar 文件名，Windows 需要额外带 .exe 后缀。
export function sidecarBinaryName(baseName, targetTriple) {
  const suffix = targetTriple.includes('windows') ? '.exe' : '';
  return `${baseName}-${targetTriple}${suffix}`;
}

// 在仓库根目录同步执行命令，失败时直接中断准备流程。
function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed`);
  }
}

// 读取本机 rustc 信息，得到当前构建机器对应的 target triple。
function targetTriple() {
  return targetTripleFromRustcVersion(
    execFileSync('rustc', ['-vV'], { encoding: 'utf8' }),
  );
}

// 准备 Tauri 打包需要的 sidecar 资源：构建 server、部署生产依赖、复制当前 Node runtime。
export function prepareSidecar() {
  rmSync(serverResourceDir, { force: true, recursive: true });

  run('pnpm', ['--filter', '@crazyclaw/core', 'build']);
  run('pnpm', ['--filter', '@carzyclaw/server', 'build']);

  mkdirSync(serverResourceDir, { recursive: true });
  run('pnpm', [
    '--filter',
    '@carzyclaw/server',
    'deploy',
    '--prod',
    '--legacy',
    serverResourceDir,
  ]);

  rmSync(binariesDir, { force: true, recursive: true });
  mkdirSync(binariesDir, { recursive: true });
  const binaryPath = join(
    binariesDir,
    sidecarBinaryName(sidecarBaseName, targetTriple()),
  );
  copyFileSync(process.execPath, binaryPath);
  chmodSync(binaryPath, 0o755);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  prepareSidecar();
}
