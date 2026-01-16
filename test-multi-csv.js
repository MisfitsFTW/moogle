const dataService = require('./services/dataService');
const schemaService = require('./services/schemaService');

async function testMultiCsv() {
    console.log('🧪 Starting Multi-CSV Integration Test...\n');

    try {
        // 1. Test Data Loading
        console.log('1️⃣ Loading Data...');
        const data = await dataService.loadData();
        const tables = Object.keys(data);

        console.log(`\nLoaded Tables: [${tables.join(', ')}]`);

        if (tables.length < 3) {
            throw new Error(`Expected at least 3 tables, found ${tables.length}`);
        }

        // 2. Test Schema Inference
        console.log('\n2️⃣ Testing Schema Inference...');
        const schema = schemaService.getSchemaForLLM();
        console.log('Schema Preview (first 200 chars):');
        console.log(schema.substring(0, 200) + '...\n');

        if (!schema.includes('Table: workers') || !schema.includes('Table: Generic Email Accounts')) {
            throw new Error('Schema is missing expected tables');
        }

        // 3. Test Query Execution - Workers
        console.log('3️⃣ Testing Query: Workers (Show first 2)');
        const q1 = {
            limit: 2,
            columns: ['Name', 'Position', 'Department']
        };
        // Assuming table name is case-sensitive and matches filename
        const r1 = dataService.executeQuery(q1, 'workers');
        console.log(`Result 1 (${r1.length} rows):`, r1);

        // 4. Test Query Execution - Emails (Filter by Department)
        console.log('\n4️⃣ Testing Query: Emails (Filter Department contains "IT")');
        // Need to check actual column names from file inspection or relying on dynamic typing
        // "Generic Email Accounts.csv" columns?
        // I'll assume Schema Service output would show me, but I'll guess a common column like 'Department' exists based on file content viewed earlier.
        // Actually, let's just do a count first to be safe if I don't recall exact column.
        // Step 77 viewed `Generic Email Accounts.csv`: "Department", "Section", "Contact"...
        const q2 = {
            filters: [{ column: 'Department', operator: 'contains', value: 'IT' }],
            limit: 5
        };
        const r2 = dataService.executeQuery(q2, 'Generic Email Accounts');
        console.log(`Result 2 (${r2.length} rows):`, r2.length > 0 ? r2[0] : 'No match');

        // 5. Test Query Execution - Assets (Count by Make)
        console.log('\n5️⃣ Testing Query: Assets (Count by Make)');
        // Step 77 viewed `MEEC AMS Asset List.csv`: "Make", "Model"...
        const q3 = {
            groupBy: 'Make',
            aggregate: [{ function: 'count', alias: 'count' }],
            limit: 3,
            sort: { column: 'count', direction: 'desc' }
        };
        const r3 = dataService.executeQuery(q3, 'MEEC AMS Asset List');
        console.log(`Result 3 (Top 3 Makes):`, r3);

        console.log('\n✅ Data Integration Test Passed!');

    } catch (error) {
        console.error('\n❌ Test Failed:', error);
        process.exit(1);
    }
}

testMultiCsv();
