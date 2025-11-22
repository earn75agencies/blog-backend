/**
 * Script to kill process running on a specific port
 * Usage: node scripts/kill-port.js [port]
 * Default port: 5000
 */

const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

const PORT = process.argv[2] || 5000;

async function killPort(port) {
  try {
    console.log(`🔍 Checking for processes on port ${port}...`);
    
    // Get process info on Windows
    const { stdout } = await execPromise(`netstat -ano | findstr :${port}`);
    
    if (!stdout.trim()) {
      console.log(`✅ No process found on port ${port}`);
      return;
    }

    // Extract PIDs
    const lines = stdout.trim().split('\n');
    const pids = new Set();
    
    lines.forEach(line => {
      const match = line.match(/\s+(\d+)$/);
      if (match) {
        pids.add(match[1]);
      }
    });

    if (pids.size === 0) {
      console.log(`✅ No process found on port ${port}`);
      return;
    }

    console.log(`⚠️  Found ${pids.size} process(es) on port ${port}`);
    
    // Kill each process
    for (const pid of pids) {
      try {
        await execPromise(`taskkill /F /PID ${pid}`);
        console.log(`✅ Killed process ${pid}`);
      } catch (error) {
        console.warn(`⚠️  Could not kill process ${pid}: ${error.message}`);
      }
    }
    
    console.log(`✅ Port ${port} is now free`);
  } catch (error) {
    if (error.stdout && error.stdout.includes('No matching')) {
      console.log(`✅ No process found on port ${port}`);
    } else {
      console.error(`❌ Error: ${error.message}`);
      process.exit(1);
    }
  }
}

killPort(PORT);

