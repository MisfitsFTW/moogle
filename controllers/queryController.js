const Joi = require('joi');
const llmService = require('../services/llmService');
const powerBiService = require('../services/powerBiService');

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

            // 1. Fetch Schema from Power BI (or cache it)
            // We fetch it every time to ensure we have the latest metadata, 
            // but in production you might want to cache this.
            console.log('Fetching Power BI Schema...');
            const schema = await powerBiService.getSchema();

            if (!schema) {
                throw new Error('Failed to retrieve Power BI schema');
            }

            // 2. Generate DAX query using LLM
            console.log('Generating DAX query...');
            const daxQuery = await llmService.generateDAX(query, schema);

            if (!daxQuery) {
                throw new Error('Failed to generate DAX query');
            }

            // 3. Execute DAX query against Power BI
            console.log('Executing DAX query...');
            const results = await powerBiService.executeQuery(daxQuery);

            console.log(`✓ Query executed successfully. Returned ${results.length} results`);

            // Return results
            return res.json({
                success: true,
                data: results,
                count: results.length,
                query: query,
                dax: daxQuery
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
            return res.json({
                success: true,
                status: 'healthy',
                service: 'Power BI Integration',
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
