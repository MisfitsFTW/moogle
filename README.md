# Moogle - Natural Language Query Portal

A standalone web application that allows users to query organizational worker data using natural language, powered by Google Gemini AI (FREE tier available!).

## Features

- 🗣️ **Natural Language Queries** - Ask questions in plain English
- 🤖 **AI-Powered** - Uses Google Gemini to understand and convert queries
- 📊 **Interactive Results** - Beautiful table display with sorting and filtering
- 📥 **Export Data** - Download results as CSV
- 🎨 **Modern UI** - Premium dark mode design with glassmorphism effects
- ⚡ **Fast & Responsive** - In-memory query execution
- 💰 **Free to Use** - Google Gemini offers a generous free tier

## Prerequisites

- Node.js 18+ installed
- Google Gemini API key (free tier available)
- CSV file with worker data

## Installation

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file (copy from `.env.example`):
```bash
cp .env.example .env
```

3. Configure your Google Gemini API key in `.env`:
```env
GOOGLE_GEMINI_API_KEY=your_api_key_here
CSV_DATA_PATH=./data/workers.csv
PORT=3000
```

**Get your FREE Google Gemini API key**: https://makersuite.google.com/app/apikey

## Usage

1. Start the server:
```bash
npm start
```

2. Open your browser to `http://localhost:3000`

3. Ask questions like:
   - "Show me all workers"
   - "How many workers are in each department?"
   - "Show me workers from the IT department"
   - "Who are the managers?"
   - "Show me workers on probation"

## Project Structure

```
moogle/
├── config/
│   └── schema.json          # Data schema definition
├── controllers/
│   └── queryController.js   # API request handlers
├── data/
│   └── workers.csv          # Worker data
├── public/
│   ├── css/
│   │   └── styles.css       # Premium styling
│   ├── js/
│   │   └── app.js           # Frontend logic
│   └── index.html           # Main HTML
├── routes/
│   └── api.js               # API routes
├── services/
│   ├── dataService.js       # CSV data handling
│   ├── llmService.js        # Azure OpenAI integration
│   └── schemaService.js     # Schema management
├── .env.example             # Environment template
├── package.json
└── server.js                # Express server
```

## API Endpoints

- `GET /api/health` - Health check
- `POST /api/query` - Process natural language query

## Technologies

- **Backend**: Node.js, Express.js
- **AI**: Google Gemini (gemini-pro model) - FREE tier available
- **Data**: CSV parsing with PapaCSV
- **Frontend**: Vanilla HTML/CSS/JavaScript
- **Styling**: Custom CSS with glassmorphism

## License

ISC
