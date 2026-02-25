const Joi = require('joi');
const llmService = require('../services/llmService');
const dataService = require('../services/dataService');

const querySchema = Joi.object({
    query: Joi.string().required()
});

class QueryController {
    async processQuery(req, res) {
        try {
            // Validate request
            const { error, value } = querySchema.validate(req.body);
            if (error) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid request',
                    details: error.details[0].message
                });
            }

            const { query } = value;
            console.log(`\n📝 Processing query: "${query}"`);

            // 1. Convert Natural Language to Query Instructions
            console.log('Generating query instructions...');
            const queryInstructions = await llmService.convertNaturalLanguageToQuery(query);

            if (!queryInstructions) {
                throw new Error('Failed to generate query instructions');
            }

            if (queryInstructions.error) {
                return res.json({
                    success: false,
                    answer: queryInstructions.error,
                    query: query
                });
            }

            const tableName = queryInstructions.table;
            console.log(`Target Table: ${tableName || 'Single'}`);

            // 2. Execute Query against Local Data
            console.log('Executing query against local CSV data...');
            const results = dataService.executeQuery(queryInstructions, tableName);

            console.log(`✓ Query executed successfully. Returned ${results.length} results`);

            // 3. Generate Analytical Summary & Insights
            console.log('Generating analytical feedback and insights...');
            const aiFeedback = await llmService.generateResultSummary(query, results, queryInstructions);

            // Return results with insights and sources
            return res.json({
                success: true,
                data: results,
                count: results.length,
                summary: aiFeedback.summary,
                insight: aiFeedback.insight,
                sources: [tableName || 'Main Data'],
                query: query,
                instructions: queryInstructions
            });

        } catch (error) {
            console.error('Error processing query:', error);

            return res.status(500).json({
                success: false,
                error: 'Failed to process query',
                details: error.message
            });
        }
    }

    async getHealth(req, res) {
        try {
            const dataCount = dataService.getDataCount();

            return res.json({
                success: true,
                status: 'healthy',
                dataLoaded: dataService.isLoaded,
                recordCount: dataCount,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            return res.status(500).json({
                success: false,
                status: 'unhealthy',
                error: error.message
            });
        }
    }
}

module.exports = new QueryController();
