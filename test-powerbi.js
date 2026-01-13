require('dotenv').config();
const powerBiService = require('./services/powerBiService');
const llmService = require('./services/llmService');

async function testPowerBi() {
    console.log('🧪 Testing Power BI Integration...\n');

    try {
        // 1. Test Authentication
        console.log('1. Testing Authentication...');
        const token = await powerBiService.getAccessToken();
        console.log('   ✓ Token acquired:', token.substring(0, 20) + '...\n');

        // 2. Test Schema Fetching
        console.log('2. Testing Schema Fetching...');
        const schema = await powerBiService.getSchema();
        if (schema) {
            console.log('   ✓ Schema fetched successfully');
            console.log('   Tables:', schema.tables);
            console.log('   Columns count:', schema.columns.length, '\n');
        } else {
            console.log('   ⚠ Schema fetch failed or returned null\n');
        }

        // 3. Test DAX Generation (Mocking LLM or using real one if key exists)
        console.log('3. Testing DAX Generation...');
        const query = "Count the rows in the first table";
        let dax = "";
        try {
            dax = await llmService.generateDAX(query, schema);
            console.log('   ✓ DAX Generated:', dax, '\n');
        } catch (e) {
            console.log('   ⚠ DAX Generation failed:', e.message);
            dax = "EVALUATE ROW(\"Test\", 1)"; // Fallback for execution test
        }

        // 4. Test Query Execution
        console.log('4. Testing Query Execution...');
        const results = await powerBiService.executeQuery(dax);
        console.log('   ✓ Query executed successfully');
        console.log('   Results:', JSON.stringify(results, null, 2));

    } catch (error) {
        console.error('\n❌ Test Failed:', error.message);
        if (error.response) {
            console.error('   Response Status:', error.response.status);
            console.error('   Response Data:', JSON.stringify(error.response.data, null, 2));
            console.error('   Response Headers:', JSON.stringify(error.response.headers, null, 2));
        }
    }
}

testPowerBi();
