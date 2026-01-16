const dataService = require('./dataService');

class SchemaService {
  constructor() {
    // Schema is now inferred dynamically from loaded data
  }

  getSchemaForLLM() {
    const data = dataService.getAllData();
    const tables = Object.keys(data);

    if (tables.length === 0) {
      return "No data loaded yet. Please ensure data service has loaded CSV files.";
    }

    let schemaText = 'DATABASE SCHEMA:\n\n';

    tables.forEach(tableName => {
      const rows = data[tableName];
      if (!rows || rows.length === 0) {
        schemaText += `Table: ${tableName} (Empty)\n\n`;
        return;
      }

      schemaText += `Table: ${tableName}\n`;
      schemaText += `Columns:\n`;

      // Infer columns from the first row
      // We could scan more rows to be more proper about types, but first row is usually enough for CSVs
      const columns = Object.keys(rows[0]);

      columns.forEach(col => {
        // Simple type inference
        let type = 'string';
        const sampleValue = rows[0][col];
        if (typeof sampleValue === 'number') type = 'number';
        else if (typeof sampleValue === 'boolean') type = 'boolean';

        schemaText += `  - ${col} (${type})`;

        // Add sample values for context if it's a string, to help LLM understand the data
        if (type === 'string' && sampleValue) {
          // For categorical-looking data, maybe show a few unique values? 
          // keeping it simple for now, just description
        }
        schemaText += '\n';
      });
      schemaText += '\n';
    });

    return schemaText;
  }

  getColumns(tableName) {
    const data = dataService.getAllData();
    if (!data[tableName] || data[tableName].length === 0) return [];
    return Object.keys(data[tableName][0]);
  }
}

module.exports = new SchemaService();
