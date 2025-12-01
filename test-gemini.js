require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function testModel(modelName) {
    const apiKey = process.env.GOOGLE_GEMINI_API_KEY;

    console.log(`\n=== Testing model: ${modelName} ===`);

    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: modelName });

        const result = await model.generateContent('Say hello in one word');
        const response = await result.response;
        const text = response.text();

        console.log(`✅ SUCCESS with ${modelName}!`);
        console.log('Response:', text);
        return true;
    } catch (error) {
        console.log(`❌ FAILED with ${modelName}`);
        console.log('Error:', error.message);
        console.log('Status:', error.status);
        return false;
    }
}

async function testGemini() {
    const apiKey = process.env.GOOGLE_GEMINI_API_KEY;

    console.log('Testing Google Gemini API...');
    console.log('API Key:', apiKey);

    if (!apiKey) {
        console.error('❌ No API key found in .env file');
        return;
    }

    // Try different model names based on user's suggestion
    const models = [
        'gemini-2.0-flash-lite',
        'gemini-2.0-flash',
        'gemini-1.5-flash',
        'gemini-1.5-pro',
        'gemini-pro',
        'models/gemini-2.0-flash-lite',
        'models/gemini-2.0-flash',
        'models/gemini-1.5-flash'
    ];

    for (const modelName of models) {
        const success = await testModel(modelName);
        if (success) {
            console.log(`\n✅ ✅ ✅ WORKING MODEL FOUND: ${modelName} ✅ ✅ ✅`);
            console.log(`\nUpdate llmService.js to use: '${modelName}'`);
            break;
        }
        // Small delay between attempts
        await new Promise(resolve => setTimeout(resolve, 500));
    }
}

testGemini();
