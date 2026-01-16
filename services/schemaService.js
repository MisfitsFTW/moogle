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

        // Collect distinct values for string columns (to catch Enums like Status, Dept)
        // Scan up to 1000 rows to be performant but comprehensive
        let distinctValues = [];
        if (type === 'string') {
          const values = new Set();
          for (let i = 0; i < Math.min(rows.length, 1000); i++) {
            const val = rows[i][col];
            if (val) values.add(val.toString().trim());
          }
          if (values.size > 0 && values.size <= 50) {
            distinctValues = Array.from(values).slice(0, 50); // Cap at 50 just in case
          }
        }

        schemaText += `  - ${col} (${type})`;

        if (distinctValues.length > 0) {
          schemaText += ` [Values: ${distinctValues.join(', ')}]`;
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
