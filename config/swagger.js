const swaggerJsdoc = require('swagger-jsdoc');

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Moogle API',
            version: '1.0.0',
            description: 'Natural Language Query Portal for Organizational Worker Data - Powered by Google Gemini AI',
            contact: {
                name: 'API Support',
                email: 'support@moogle.local'
            }
        },
        servers: [
            {
                url: 'http://localhost:3000',
                description: 'Development server'
            }
        ],
        tags: [
            {
                name: 'Health',
                description: 'Health check endpoints'
            },
            {
                name: 'Query',
                description: 'Natural language query processing'
            }
        ]
    },
    apis: ['./routes/*.js', './controllers/*.js']
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
