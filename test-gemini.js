require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function testGemini() {
    const apiKey = process.env.GOOGLE_GEMINI_API_KEY;

    console.log('Testing Google Gemini API...');
    console.log('API Key (first 10 chars):', apiKey ? apiKey.substring(0, 10) + '...' : 'NOT SET');

    if (!apiKey) {
        console.error('❌ No API key found in .env file');
        return;
    }

    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

        console.log('✓ Client initialized');
        console.log('Sending test prompt...');

        const result = await model.generateContent('Say hello');
        const response = await result.response;
        const text = response.text();

        console.log('✓ SUCCESS! Response:', text);
    } catch (error) {
        console.error('❌ ERROR:', error.message);
        console.error('Full error:', error);
    }
}

testGemini();
