const express = require('express');
const router = express.Router();

// In-memory store for OTC codes (for demo purposes)
// In production, use Redis or a database with TTL
const otcStore = new Map();

/**
 * @swagger
 * /api/auth/otc/request:
 *   post:
 *     summary: Request a One-Time Code
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: Code sent successfully
 */
router.post('/otc/request', (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ success: false, error: 'Email is required' });
    }

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // Store code with 5-minute expiration
    otcStore.set(email, {
        code,
        expires: Date.now() + 5 * 60 * 1000
    });

    // In a real app, send via email provider (SendGrid, etc.)
    // For now, log to console
    console.log(`\n🔐 OTC Code for ${email}: ${code}\n`);

    res.json({
        success: true,
        message: 'Code sent to email (check server console)'
    });
});

/**
 * @swagger
 * /api/auth/otc/verify:
 *   post:
 *     summary: Verify One-Time Code
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, code]
 *             properties:
 *               email:
 *                 type: string
 *               code:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 */
router.post('/otc/verify', (req, res) => {
    const { email, code } = req.body;

    if (!email || !code) {
        return res.status(400).json({ success: false, error: 'Email and code are required' });
    }

    const storedData = otcStore.get(email);

    if (!storedData) {
        return res.status(400).json({ success: false, error: 'No code requested for this email' });
    }

    if (Date.now() > storedData.expires) {
        otcStore.delete(email);
        return res.status(400).json({ success: false, error: 'Code expired' });
    }

    if (storedData.code !== code) {
        return res.status(400).json({ success: false, error: 'Invalid code' });
    }

    // Code is valid
    otcStore.delete(email); // Consume code

    // Return a mock token
    res.json({
        success: true,
        token: 'mock-jwt-token-' + Date.now(),
        user: { email }
    });
});

module.exports = router;
