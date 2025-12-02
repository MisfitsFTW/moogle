require('dotenv').config();
const llmService = require('./services/llmService');
const dataService = require('./services/dataService');

async function run() {
    try {
        console.log('Loading data...');
        await dataService.loadData();

        const query = "Show me IT workers older than 40";
        console.log(`Processing query: "${query}"`);

        const queryInstructions = await llmService.convertNaturalLanguageToQuery(query);
        console.log('Query Instructions:', JSON.stringify(queryInstructions, null, 2));

        if (!queryInstructions) {
            console.error('Error: queryInstructions is null or undefined');
            return;
        }

        const results = dataService.executeQuery(queryInstructions);
        console.log(`Results count: ${results.length}`);
        console.log('First result:', results[0]);

    } catch (error) {
        console.error('Error:', error);
    }
}

run();
