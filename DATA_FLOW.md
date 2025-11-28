# How Data Flows in Moogle

## Important Clarification

**Requests are NOT sent to the Power BI semantic model or any external database.**

Instead, Moogle works entirely with **in-memory data** loaded from your CSV file. Here's how it works:

## Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ 1. SERVER STARTUP                                           │
│    CSV file is loaded into memory (data/workers.csv)        │
│    ↓                                                         │
│    Data is parsed and cached in memory                      │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. USER SUBMITS QUERY                                       │
│    "Show me workers from the IT department"                 │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. GOOGLE GEMINI PROCESSES QUERY                            │
│    Natural language → Structured query instructions         │
│    Returns: {                                               │
│      "filters": [{                                          │
│        "column": "Department",                              │
│        "operator": "equals",                                │
│        "value": "IT"                                        │
│      }]                                                     │
│    }                                                        │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. IN-MEMORY QUERY ENGINE EXECUTES                          │
│    Filters the cached CSV data in memory                    │
│    NO database queries, NO API calls to Power BI            │
│    Pure JavaScript array filtering/sorting/grouping         │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. RESULTS RETURNED TO FRONTEND                             │
│    Filtered data displayed in table                         │
└─────────────────────────────────────────────────────────────┘
```

## Key Points

1. **CSV Data is Loaded Once**: When the server starts, it reads the CSV file and stores all data in memory
2. **No External Queries**: All filtering, sorting, and aggregation happens in memory using JavaScript
3. **Google Gemini's Role**: Only converts natural language to query instructions - it does NOT access your data
4. **Fast Performance**: Since everything is in memory, queries execute instantly

## Future Enhancement: Power BI Integration

As noted in the implementation plan, **Option 1** for future development is to connect to Power BI REST API. This would:
- Execute DAX queries against the actual Power BI semantic model
- Access live data instead of static CSV
- Support real-time updates

But for now, Moogle works entirely offline with your CSV data!
