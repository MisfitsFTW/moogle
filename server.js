require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');
const apiRoutes = require('./routes/api');
const authRoutes = require('./routes/auth');
const dataService = require('./services/dataService');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Swagger API Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Moogle API Documentation'
}));

// API routes
app.use('/api', apiRoutes);
app.use('/api/auth', authRoutes);

// OTC Sign-in Page
app.get('/otc/signin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'otc-signin.html'));
});

// Root route - serve index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({
        success: false,
        error: 'Internal server error',
        details: err.message
    });
});

// Initialize data and start server
async function startServer() {
    try {
        console.log('🚀 Starting Moogle server...\n');

        // Load CSV data
        await dataService.loadData();

        // Start Express server
        app.listen(PORT, () => {
            console.log(`\n✓ Server running on http://localhost:${PORT}`);
            console.log(`✓ API available at http://localhost:${PORT}/api`);
            console.log(`✓ API Documentation: http://localhost:${PORT}/api-docs`);
            console.log(`✓ Health check: http://localhost:${PORT}/api/health\n`);
            console.log('Ready to process natural language queries! 🎉\n');
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

startServer();
