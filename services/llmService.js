const { GoogleGenerativeAI } = require('@google/generative-ai');
const schemaService = require('./schemaService');

class LLMService {
  constructor() {
    this.genAI = null;
    this.model = null;
    this.initializeClient();
  }

  initializeClient() {
    const apiKey = process.env.GOOGLE_GEMINI_API_KEY;

    if (!apiKey) {
      console.warn('⚠ Google Gemini API key not configured. LLM service will not work.');
      console.warn('Please set GOOGLE_GEMINI_API_KEY in .env file');
      console.warn('Get your free API key at: https://makersuite.google.com/app/apikey');
      return;
    }

    try {
      this.genAI = new GoogleGenerativeAI(apiKey);
      this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash-lite' });
      console.log('✓ Google Gemini client initialized (gemini-2.0-flash-lite)');
    } catch (error) {
      console.error('Error initializing Google Gemini client:', error.message);
    }
  }

  async convertNaturalLanguageToQuery(naturalLanguageQuery) {
    if (!this.model) {
      throw new Error('Google Gemini client not initialized. Please configure API key in .env file.');
    }

    const schema = schemaService.getSchemaForLLM();

    const systemPrompt = `You are a helpful assistant that converts natural language questions about employee/worker data into structured query instructions.

${schema}

Your task is to analyze the user's question and return a JSON object with query instructions. The JSON should have this structure:

{
  "filters": [
    {
      "column": "column_name",
      "operator": "equals|contains|>|<|>=|<=",
      "value": "value_to_filter"
    }
  ],
  "sort": {
    "column": "column_name",
    "direction": "asc|desc"
  },
  "groupBy": "column_name",
  "aggregate": [
    {
      "function": "count|sum|avg",
      "column": "column_name",
      "alias": "result_name"
    }
  ],
  "limit": number,
  "columns": ["column1", "column2"]
}

IMPORTANT RULES:
1. Only include the fields that are needed for the query
2. Use exact column names from the schema
3. For "show all" queries, return an empty object {} or just specify columns
4. For counting queries, use groupBy and aggregate with count function
5. For filtering by text, use "contains" operator for partial matches, "equals" for exact matches
6. Return ONLY the JSON object, no explanations or markdown
7. If the question cannot be answered with the available data, return {"error": "explanation"}

Examples:
- "Show me all workers" → {}
- "Show workers from IT" → {"filters": [{"column": "Department", "operator": "equals", "value": "IT"}]}
- "How many workers in each department?" → {"groupBy": "Department", "aggregate": [{"function": "count", "alias": "count"}]}
- "Top 10 workers with most leave" → {"sort": {"column": "Hours_of_Leave_Utilised", "direction": "desc"}, "limit": 10}

USER QUESTION: ${naturalLanguageQuery}

Return only the JSON query instructions:`;

    try {
      const result = await this.model.generateContent(systemPrompt);
      const response = await result.response;
      const content = response.text().trim();

      // Remove markdown code blocks if present
      let jsonContent = content;
      if (content.includes('```')) {
        jsonContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      }

      const queryInstructions = JSON.parse(jsonContent);

      console.log('Query instructions generated:', JSON.stringify(queryInstructions, null, 2));

      return queryInstructions;
    } catch (error) {
      console.error('Error calling Google Gemini:', error);
      throw new Error(`Failed to process natural language query: ${error.message}`);
    }
  }
}

module.exports = new LLMService();
