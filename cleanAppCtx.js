const fs = require('fs');
let code = fs.readFileSync('src/context/AppContext.jsx', 'utf8');

// Find start and end indices
const signUpStart = code.indexOf("  const signUpUser = async");
const onboardingStart = code.indexOf("  // ── Onboarding Helpers ──");

if (signUpStart !== -1 && onboardingStart !== -1) {
  code = code.substring(0, signUpStart) + code.substring(onboardingStart);
}

const logoutStart = code.indexOf("  const logoutUser = async");
const auditStart = code.indexOf("  // Audit Logging");

if (logoutStart !== -1 && auditStart !== -1) {
  code = code.substring(0, logoutStart) + code.substring(auditStart);
}

fs.writeFileSync('src/context/AppContext.jsx', code);
console.log('Cleaned AppContext.jsx');
