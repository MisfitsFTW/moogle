const express = require('express');
const router = express.Router();
const queryController = require('../controllers/queryController');

/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: Health check endpoint
 *     description: Check if the Moogle API server is running and responsive
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Server is healthy and running
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 *                 message:
 *                   type: string
 *                   example: Moogle API is running
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                   example: 2025-12-01T12:00:00.000Z
 */
router.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        message: 'Moogle API is running',
        timestamp: new Date().toISOString()
    });
});

/**
 * @swagger
 * /api/query:
 *   post:
 *     summary: Process natural language query
 *     description: Convert natural language questions into structured queries and return filtered worker data
 *     tags: [Query]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - query
 *             properties:
 *               query:
 *                 type: string
 *                 description: Natural language question about worker data
 *                 example: Show me all workers from the IT department
 *                 minLength: 3
 *                 maxLength: 500
 *           examples:
 *             showAll:
 *               summary: Show all workers
 *               value:
 *                 query: Show me all workers
 *             filterByDepartment:
 *               summary: Filter by department
 *               value:
 *                 query: Show me workers from the IT department
 *             countByDepartment:
 *               summary: Count by department
 *               value:
 *                 query: How many workers are in each department?
 *             topWorkers:
 *               summary: Top workers by leave
 *               value:
 *                 query: Show me the top 10 workers with most leave hours
 *     responses:
 *       200:
 *         description: Query processed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       ID:
 *                         type: string
 *                         example: W001
 *                       Corp:
 *                         type: string
 *                         example: john.doe
 *                       Name:
 *                         type: string
 *                         example: John
 *                       Surname:
 *                         type: string
 *                         example: Doe
 *                       Gender:
 *                         type: string
 *                         example: M
 *                       DOB:
 *                         type: string
 *                         example: 1990-01-15
 *                       Current_Position:
 *                         type: string
 *                         example: Software Developer
 *                       Class:
 *                         type: number
 *                         example: 5
 *                       Department:
 *                         type: string
 *                         example: IT
 *                       Section:
 *                         type: string
 *                         example: Development
 *                       Appointment_Date:
 *                         type: string
 *                         example: 2020-03-01
 *                       Commencement_Date:
 *                         type: string
 *                         example: 2020-03-15
 *                       Confirmed_Appointment:
 *                         type: string
 *                         example: 2020-09-15
 *                       Remarks:
 *                         type: string
 *                         example: Active
 *                       Hours_of_Leave_Utilised:
 *                         type: number
 *                         example: 120
 *                 count:
 *                   type: number
 *                   example: 25
 *                 query:
 *                   type: string
 *                   example: Show me workers from the IT department
 *                 queryInstructions:
 *                   type: object
 *                   description: The structured query instructions generated by AI
 *       400:
 *         description: Invalid request - validation error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: Invalid request
 *                 details:
 *                   type: string
 *                   example: "query" is required
 *       500:
 *         description: Server error - failed to process query
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: Failed to process query
 *                 details:
 *                   type: string
 *                   example: Error message details
 */
router.post('/query', queryController.processQuery);

module.exports = router;
