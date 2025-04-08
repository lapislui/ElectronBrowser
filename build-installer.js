const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const ELECTRON_EXE_PATH = `"${path.join(__dirname, 'node_modules', 'electron', 'dist', 'electron.exe')}"`;

function runBrowser() {
  console.log('Starting Electron Browser...');

  try {
    const electronProcess = spawn(ELECTRON_EXE_PATH, ['.'], {
      stdio: 'inherit',
      shell: true,
      cwd: __dirname,
    });

    electronProcess.on('error', (error) => {
      console.error('Failed to start electron browser:', error);
    });

    electronProcess.on('close', (code) => {
      console.log(`Electron browser exited with code ${code}`);
    });

    return electronProcess;
  } catch (error) {
    console.error('Error running browser:', error);
    return null;
  }
}

function buildInstaller() {
  console.log('Building Electron Browser installer...');

  try {
    const tempDir = path.join(__dirname, 'temp_build');

    // Clean previous builds
    if (fs.existsSync('dist')) fs.rmSync('dist', { recursive: true, force: true });
    if (fs.existsSync(tempDir)) fs.rmSync(tempDir, { recursive: true, force: true });
    fs.mkdirSync(tempDir);

    // Copy necessary files - removed main.js since index.js is the main entry point
    const filesToCopy = [
      'package.json',
      'package-lock.json',
      'index.js',
      'index.html',
      'preload.js',
      'renderer.js',
      'styles.css',
      'assets',
      'src'
    ];

    for (const file of filesToCopy) {
      const src = path.join(__dirname, file);
      const dest = path.join(tempDir, file);
      if (fs.existsSync(src)) {
        const stat = fs.statSync(src);
        if (stat.isDirectory()) fs.cpSync(src, dest, { recursive: true });
        else fs.copyFileSync(src, dest);
      }
    }

    // Install production dependencies
    execSync('npm install --only=prod', {
      stdio: 'inherit',
      cwd: tempDir
    });

    // Build with electron-builder
    execSync('npx electron-builder --win --x64', {
      stdio: 'inherit',
      env: {
        ...process.env,
        NODE_ENV: 'production'
      },
      cwd: tempDir
    });

    // Copy output back
    const tempDist = path.join(tempDir, 'dist');
    if (fs.existsSync(tempDist)) {
      fs.cpSync(tempDist, path.join(__dirname, 'dist'), { recursive: true });
    }

    // Clean temp
    fs.rmSync(tempDir, { recursive: true, force: true });
    console.log('✅ Build completed successfully!');
  } catch (error) {
    console.error('❌ Error building installer:', error);
    process.exit(1);
  }
}

function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case 'run':
      runBrowser();
      break;
    case 'build':
      buildInstaller();
      break;
    default:
      console.log(`
Electron Browser Build Tool
--------------------------
Usage:
  node build-installer.js [command]

Commands:
  run    - Run the Electron browser for testing
  build  - Build the Windows installer (MSI and NSIS)
`);
      break;
  }
}

main();
