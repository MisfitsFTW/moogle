require('dotenv').config();
const llmService = require('./services/llmService');

async function verifySummary() {
    await llmService.init();

    const query = "Show me assets from IT";
    const results = [
        { "MITA Inv No.": "325319", "Make": "Dell", "Model": "Latitude", "Department": "IT" },
        { "MITA Inv No.": "343224", "Make": "HP", "Model": "EliteBook", "Department": "IT" },
        { "MITA Inv No.": "123456", "Make": "Dell", "Model": "Latitude", "Department": "IT" }
    ];
    const instructions = { "table": "MEEC AMS Asset List", "filters": [{ "column": "Department", "operator": "equals", "value": "IT" }] };

    console.log('Testing generateResultSummary...');
    try {
        const feedback = await llmService.generateResultSummary(query, results, instructions);
        console.log('\n--- AI Feedback ---');
        console.log(JSON.stringify(feedback, null, 2));

        if (feedback.summary) {
            console.log('\n✅ Verification successful! AI provided a summary.');
        } else {
            console.log('\n❌ Verification failed: No summary returned.');
        }
    } catch (error) {
        console.error('\n❌ Verification error:', error.message);
    }
}

verifySummary();
