const dataService = require('./services/dataService');
const schemaService = require('./services/schemaService');

async function testFiltering() {
    console.log('🧪 Starting Negative Filtering & Schema Test...\n');

    try {
        // 1. Load Data
        console.log('1️⃣ Loading Data...');
        await dataService.loadData();

        // 2. Test Schema Output for "Written Off"
        console.log('\n2️⃣ Testing Schema Inference for Unique Values...');
        const schema = schemaService.getSchemaForLLM();

        if (schema.includes('Written Off')) {
            console.log('✅ Schema successfully lists "Written Off" as a value.');
        } else {
            console.warn('⚠️ "Written Off" NOT found in schema output. LLM might struggle.');
            // Dump section of schema for debugging
            console.log('DEBUG: Schema Preview for Asset Table:');
            const tableStart = schema.indexOf('Table: MEEC AMS Asset List');
            console.log(schema.substring(tableStart, tableStart + 1500));
        }

        // 3. Test Negative Filter Execution (NOT Written Off)
        console.log('\n3️⃣ Testing Logic: Filter Department NOT EQUALS "Written Off"...');

        // We need to know which table has "Written Off". Assuming it's in "MEEC AMS Asset List" -> Department (or similar)
        // Verify via simple positive query first? No, let's trust our analysis.

        const validQuery = {
            filters: [
                { column: 'Department', operator: 'not_equals', value: 'Written Off' }
            ],
            limit: 5,
            columns: ['MITA Inventory Number', 'Department']
        };

        const results = dataService.executeQuery(validQuery, 'MEEC AMS Asset List');

        console.log(`Query returned ${results.length} rows.`);

        const hasWrittenOff = results.some(r => r.Department === 'Written Off');
        if (hasWrittenOff) {
            throw new Error('❌ Test Failed: Result Set contains "Written Off" records despite negative filter!');
        } else {
            console.log('✅ Success: No "Written Off" records found in usage.');
        }

        // 4. Test Partial Negative (not_contains)
        console.log('\n4️⃣ Testing Logic: Filter Site NOT CONTAINS "Written"...');
        const q2 = {
            filters: [
                { column: 'Site', operator: 'not_contains', value: 'Written' }
            ],
            limit: 5,
            columns: ['Site']
        };
        const r2 = dataService.executeQuery(q2, 'MEEC AMS Asset List');
        const hasWritten = r2.some(r => r.Site && r.Site.includes('Written'));
        if (hasWritten) {
            throw new Error('❌ Test Failed: Result Set contains "Written" sites!');
        } else {
            console.log('✅ Success: "not_contains" filter logic works.');
        }

    } catch (error) {
        console.error('\n❌ Test Failed:', error);
        process.exit(1);
    }
}

testFiltering();
