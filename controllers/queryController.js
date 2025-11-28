const Joi = require('joi');
const llmService = require('../services/llmService');
const dataService = require('../services/dataService');

const querySchema = Joi.object({
    query: Joi.string().required().min(3).max(500)
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

            // Convert natural language to query instructions using LLM
            const queryInstructions = await llmService.convertNaturalLanguageToQuery(query);

            // Check for error in query instructions
            if (queryInstructions.error) {
                return res.status(400).json({
                    success: false,
                    error: queryInstructions.error,
                    originalQuery: query
                });
            }

            // Execute query against CSV data
            let results;
            if (Object.keys(queryInstructions).length === 0) {
                // Empty query instructions means "show all"
                results = dataService.getAllData();
            } else {
                results = dataService.executeQuery(queryInstructions);
            }

            console.log(`✓ Query executed successfully. Returned ${results.length} results`);

            // Return results
            return res.json({
                success: true,
                data: results,
                count: results.length,
                query: query,
                queryInstructions: queryInstructions
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
