const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

console.log('--- CampusResolve Diagnostic Tool ---');

// 1. Check Supabase
console.log('\n[1] Checking Supabase Configuration:');
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url) console.error('❌ SUPABASE_URL is missing!');
else console.log('✅ SUPABASE_URL is present');

if (!key) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY is missing!');
} else {
  try {
    const payloadBase64 = key.split('.')[1];
    const payload = JSON.parse(Buffer.from(payloadBase64, 'base64').toString());
    
    if (payload.role === 'anon') {
      console.error('❌ ERROR: Your SUPABASE_SERVICE_ROLE_KEY is actually the "anon" key!');
      console.error('   Administrative actions (like generating reset links) REQUIRE the "service_role" key.');
      console.log('   Fix: Go to Supabase Dashboard -> Settings -> API and copy the "service_role" key (secret).');
    } else if (payload.role === 'service_role') {
      console.log('✅ SUPABASE_SERVICE_ROLE_KEY is a valid service_role key');
    } else {
      console.log(`ℹ️  Key role found: ${payload.role}`);
    }
  } catch (e) {
    console.error('❌ Failed to parse SUPABASE_SERVICE_ROLE_KEY. Make sure it is a valid JWT.');
  }
}

// 2. Check Google
console.log('\n[2] Checking Google Configuration:');
const googleId = process.env.GOOGLE_CLIENT_ID;
if (!googleId) console.error('❌ GOOGLE_CLIENT_ID is missing!');
else console.log('✅ GOOGLE_CLIENT_ID: ' + googleId);

console.log('\n[3] Google Sign-In 403 Solution:');
console.log('Ensure "http://localhost:5173" is added to "Authorized JavaScript origins" in Google Cloud Console:');
console.log('https://console.cloud.google.com/apis/credentials');

console.log('\n--- End of Diagnostic ---');
