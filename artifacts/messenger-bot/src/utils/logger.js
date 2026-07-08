const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  cyan: "\x1b[36m",
  gray: "\x1b[90m",
};

function timestamp() {
  return new Date().toLocaleString("ar-SA", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}

const logger = {
  info: (msg) =>
    console.log(`${colors.cyan}[${timestamp()}]${colors.reset} ${colors.green}ℹ${colors.reset} ${msg}`),
  error: (msg) =>
    console.error(`${colors.cyan}[${timestamp()}]${colors.reset} ${colors.red}✖${colors.reset} ${msg}`),
  warn: (msg) =>
    console.warn(`${colors.cyan}[${timestamp()}]${colors.reset} ${colors.yellow}⚠${colors.reset} ${msg}`),
  success: (msg) =>
    console.log(`${colors.cyan}[${timestamp()}]${colors.reset} ${colors.green}✔${colors.reset} ${msg}`),
};

module.exports = logger;
