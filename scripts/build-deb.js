#!/usr/bin/env node

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const packageJson = require(path.join(rootDir, 'package.json'));
const distDir = path.join(rootDir, 'dist');
const linuxUnpackedDir = path.join(distDir, 'linux-unpacked');
const outputPath = path.join(distDir, `${packageJson.name}_${packageJson.version}_amd64.deb`);
const iconPath = path.join(rootDir, 'resources', 'icons', 'icon-1024.png');

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    ...options
  });

  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed`);
  }
}

function copyFiltered(source, destination) {
  fs.cpSync(source, destination, {
    recursive: true,
    dereference: false,
    filter: (entry) => path.basename(entry) !== '.DS_Store'
  });
}

function getDirectorySizeBytes(targetDir) {
  let total = 0;
  for (const entry of fs.readdirSync(targetDir, { withFileTypes: true })) {
    const fullPath = path.join(targetDir, entry.name);
    const stats = fs.lstatSync(fullPath);
    if (entry.isDirectory()) {
      total += getDirectorySizeBytes(fullPath);
    } else {
      total += stats.size;
    }
  }
  return total;
}

function makeTarGz(sourceDir, outputFile) {
  run('tar', [
    '--uid', '0',
    '--gid', '0',
    '--uname', 'root',
    '--gname', 'root',
    '-czf',
    outputFile,
    '-C',
    sourceDir,
    '.'
  ]);
}

function pad(value, length) {
  const stringValue = String(value);
  if (stringValue.length > length) {
    throw new Error(`ar header value is too long: ${stringValue}`);
  }
  return stringValue.padEnd(length, ' ');
}

function arMember(name, data) {
  const safeName = name.endsWith('/') ? name : `${name}/`;
  const header = [
    pad(safeName, 16),
    pad(Math.floor(Date.now() / 1000), 12),
    pad(0, 6),
    pad(0, 6),
    pad('100644', 8),
    pad(data.length, 10),
    '`\n'
  ].join('');

  return Buffer.concat([
    Buffer.from(header),
    data,
    data.length % 2 === 0 ? Buffer.alloc(0) : Buffer.from('\n')
  ]);
}

function writeArArchive(outputFile, members) {
  const archive = Buffer.concat([
    Buffer.from('!<arch>\n'),
    ...members.map(({ name, data }) => arMember(name, data))
  ]);
  fs.writeFileSync(outputFile, archive);
}

function main() {
  if (!fs.existsSync(linuxUnpackedDir)) {
    throw new Error(`Missing Linux app directory: ${linuxUnpackedDir}`);
  }

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nzbarr-deb-'));
  const controlRoot = path.join(tempDir, 'control');
  const dataRoot = path.join(tempDir, 'data');
  const appTargetDir = path.join(dataRoot, 'opt', 'NZBarr');
  const desktopTargetDir = path.join(dataRoot, 'usr', 'share', 'applications');
  const iconTargetDir = path.join(dataRoot, 'usr', 'share', 'icons', 'hicolor', '1024x1024', 'apps');

  fs.mkdirSync(controlRoot, { recursive: true });
  fs.mkdirSync(appTargetDir, { recursive: true });
  fs.mkdirSync(desktopTargetDir, { recursive: true });
  fs.mkdirSync(iconTargetDir, { recursive: true });

  copyFiltered(linuxUnpackedDir, appTargetDir);
  fs.copyFileSync(iconPath, path.join(iconTargetDir, `${packageJson.name}.png`));

  const desktopFile = [
    '[Desktop Entry]',
    'Name=NZBarr',
    `Comment=${packageJson.description}`,
    'Exec=/opt/NZBarr/nzbarr-desktop %U',
    `Icon=${packageJson.name}`,
    'Terminal=false',
    'Type=Application',
    'Categories=AudioVideo;Video;'
  ].join('\n');
  fs.writeFileSync(path.join(desktopTargetDir, `${packageJson.name}.desktop`), `${desktopFile}\n`);

  const author = packageJson.author || {};
  const maintainer = `${author.name || 'NZBarr'} <${author.email || 'info@nzbarr.com'}>`;
  const installedSizeKb = Math.ceil(getDirectorySizeBytes(dataRoot) / 1024);
  const controlFile = [
    `Package: ${packageJson.name}`,
    `Version: ${packageJson.version}`,
    'Section: video',
    'Priority: optional',
    'Architecture: amd64',
    'Depends: libgtk-3-0, libnotify4, libnss3, libxss1, libxtst6, xdg-utils, libatspi2.0-0, libuuid1, libsecret-1-0',
    'Recommends: libappindicator3-1',
    `Maintainer: ${maintainer}`,
    `Installed-Size: ${installedSizeKb}`,
    `Homepage: ${packageJson.homepage || 'https://nzbarr.com'}`,
    `Description: ${packageJson.description}`,
    ' NZBarr is a desktop app for managing a personal Usenet media library.'
  ].join('\n');
  fs.writeFileSync(path.join(controlRoot, 'control'), `${controlFile}\n`);

  const controlTar = path.join(tempDir, 'control.tar.gz');
  const dataTar = path.join(tempDir, 'data.tar.gz');
  makeTarGz(controlRoot, controlTar);
  makeTarGz(dataRoot, dataTar);

  writeArArchive(outputPath, [
    { name: 'debian-binary', data: Buffer.from('2.0\n') },
    { name: 'control.tar.gz', data: fs.readFileSync(controlTar) },
    { name: 'data.tar.gz', data: fs.readFileSync(dataTar) }
  ]);

  fs.rmSync(tempDir, { recursive: true, force: true });
  console.log(`Built ${outputPath}`);
}

main();
