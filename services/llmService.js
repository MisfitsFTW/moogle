const { GoogleGenerativeAI } = require('@google/generative-ai');
const readline = require('readline');
const schemaService = require('./schemaService');

class LLMService {
  constructor() {
    this.genAI = null;
    this.model = null;
    this.selectedModelName = 'gemini-2.5-flash-lite'; // Default
  }

  async init() {
    await this.selectModel();
    this.initializeClient();
  }

  async selectModel() {
    const models = {
      '1': 'gemini-2.5-flash-lite',
      '2': 'gemini-2.5-pro',
      '3': 'gemini-2.5-flash'
    };

    console.log('\n--- Select Generative Model ---');
    console.log('1. gemini-2.5-flash-lite (Default)');
    console.log('2. gemini-2.5-pro');
    console.log('3. gemini-2.5-flash');

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const question = (query) => new Promise((resolve) => rl.question(query, resolve));

    const choice = await question('\nSelect a model (1-3) or press Enter for default: ');
    rl.close();

    if (choice && models[choice]) {
      this.selectedModelName = models[choice];
    } else if (choice) {
      console.log('Invalid selection. Falling back to default.');
    }

    console.log(`\n✓ Selected model: ${this.selectedModelName}`);
  }

  initializeClient() {//
    const apiKey = process.env.GOOGLE_GEMINI_API_KEY;

    if (!apiKey) {
      console.warn('⚠ Google Gemini API key not configured. LLM service will not work.');
      console.warn('Please set GOOGLE_GEMINI_API_KEY in .env file');
      console.warn('Get your free API key at: https://makersuite.google.com/app/apikey');
      return;
    }

    try {
      this.genAI = new GoogleGenerativeAI(apiKey);
      this.model = this.genAI.getGenerativeModel({ model: this.selectedModelName });
      console.log(`✓ Google Gemini client initialized (${this.selectedModelName})`);
    } catch (error) {
      console.error('Error initializing Google Gemini client:', error.message);
    }
  }

  async convertNaturalLanguageToQuery(naturalLanguageQuery) {
    if (!this.model) {
      throw new Error('Google Gemini client not initialized. Please configure API key in .env file.');
    }

    const schema = schemaService.getSchemaForLLM();

    const systemPrompt = `You are a helpful assistant that converts natural language questions about business data (workers, assets, emails) into structured query instructions.

${schema}

Your task is to analyze the user's question and return a JSON object with query instructions. The JSON should have this structure:

{
  "table": "Exact_Table_Name_From_Schema",
  "filters": [
    {
      "column": "column_name",
      "operator": "equals|not_equals|contains|not_contains|>|<|>=|<=",
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
1. "table" is REQUIRED. Choose the most relevant table from the schema.
2. Only include the fields that are needed for the query.
3. Use exact column names from the schema.
4. For "show all" queries, return an empty object {} (besides table) or just specify columns.
5. For counting queries, use groupBy and aggregate with count function.
6. For filtering by text, use "contains" operator for partial matches, "equals" for exact matches.
7. Use "not_equals" or "not_contains" for negative filters (e.g., "not written off", "excluding IT").
8. CHECK THE SCHEMA VALUES: If the schema lists [Values: ...], ALWAYS map the user's term to one of those exact values.
9. For names or people-related columns (e.g., "User Assigned", "Name"), PREFER using the "contains" operator instead of "equals" to account for varying formats (e.g., "username - name").
10. To search for multiple values in the same column (e.g., "Who are assets 123 and 456?"), provide multiple filter objects for that column.
11. If the user asks for a specific name for a column or total (e.g., "named 'Total Laptops'"), ALWAYS use the "alias" field in the aggregate or ensure the column is mapped correctly.
12. For queries asking for "Total Laptops", if counting, use {"function": "count", "alias": "Total Laptops"}.
13. Return ONLY the JSON object, no explanations or markdown.
14. If the question cannot be answered with the available data, return {"error": "explanation"}.

Examples:
- "Show me all workers" → {"table": "workers", "limit": 100}
- "Show assets from IT" → {"table": "MEEC AMS Asset List", "filters": [{"column": "Department", "operator": "equals", "value": "IT"}]}
- "Who are assets 325319 and 343224 assigned to?" → {"table": "MEEC AMS Asset List", "filters": [{"column": "MITA Inventory Number", "operator": "equals", "value": "325319"}, {"column": "MITA Inventory Number", "operator": "equals", "value": "343224"}], "columns": ["MITA Inventory Number", "User Assigned"]}
- "All assets for Jonathan Gerada" → {"table": "MEEC AMS Asset List", "filters": [{"column": "User Assigned", "operator": "contains", "value": "Jonathan Gerada"}]}

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

  // Feature Flag: Enable/Disable AI Generative Insights
  ENABLE_GENERATIVE_INSIGHTS = false;

  async generateResultSummary(naturalLanguageQuery, results, queryInstructions) {
    if (!this.model) {
      return { summary: null, insight: null };
    }

    const count = results.length;

    // If generative insights are disabled, return a simple count-based summary
    if (!this.ENABLE_GENERATIVE_INSIGHTS) {
      return {
        summary: `I found ${count} ${count === 1 ? 'result' : 'results'} for your query.`,
        insight: null
      };
    }

    try {
      const prompt = `You are a data analyst for the Public Service of Malta.
    Your task is to provide an analytical summary based on the following natural language query and its results.
    
    User Query: "${naturalLanguageQuery}"
    Total Results Found: ${results.length}
    Data Sample (top 5 rows): ${JSON.stringify(results.slice(0, 5))}
    Table Instructions: ${JSON.stringify(queryInstructions)}

    Your task is to provide feedback in JSON format with a single field:
    1. "analysis": A professional summary of the results, followed by a "smart" insight or observation.
    
    Guidelines:
    - The summary should be clear and professional (e.g., "I found 509 results for assets with expired warranty.").
    - It should be followed immediately by a smart insight or observation in a natural flow (e.g., "...of which 200 are laptops" or "...and I noticed that the IT department has the highest count of these records.").
    - Join them together so it reads like a single analytical result.
    - If there are no results, just say "I couldn't find any results for that query."
    - Be brief but helpful.

    Return ONLY the following JSON structure: {"analysis": "..."}`;

      const response = await this.model.generateContent(prompt);
      const text = response.response.text();
      const cleanedJson = text.replace(/```json|```/g, '').trim();
      const result = JSON.parse(cleanedJson);

      return {
        summary: result.analysis,
        insight: null // Insights are now unified in the summary
      };
    } catch (error) {
      console.error('Error in generateResultSummary:', error);
      return {
        summary: `I found ${count} ${count === 1 ? 'result' : 'results'} for your query.`,
        insight: null
      };
    }
  }
}

module.exports = new LLMService();
