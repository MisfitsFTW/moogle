const axios = require('axios');

async function testOtcFlow() {
    console.log('🧪 Testing OTC Sign-in Flow...\n');
    const baseUrl = 'http://localhost:3000/api/auth';
    const email = 'test@example.com';

    try {
        // 1. Request Code
        console.log('1. Requesting OTC Code...');
        const reqResponse = await axios.post(`${baseUrl}/otc/request`, { email });
        console.log('   ✓ Request successful:', reqResponse.data.message);

        // Note: In a real test we can't easily get the code since it's in memory/console.
        // But for this script, we can't verify the code unless we mock the store or expose it.
        // However, we can verify the API contract works.

        console.log('\n   ⚠ Cannot automate full verification without access to server console logs.');
        console.log('   Please manually verify by visiting: http://localhost:3000/otc/signin');

    } catch (error) {
        console.error('\n❌ Test Failed:', error.message);
        if (error.response) {
            console.error('   Response Data:', error.response.data);
        }
    }
}

testOtcFlow();
