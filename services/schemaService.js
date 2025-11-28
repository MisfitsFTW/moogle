const fs = require('fs');
const path = require('path');

class SchemaService {
  constructor() {
    this.schema = null;
    this.loadSchema();
  }

  loadSchema() {
    try {
      const schemaPath = path.join(__dirname, '../config/schema.json');
      const schemaData = fs.readFileSync(schemaPath, 'utf8');
      this.schema = JSON.parse(schemaData);
      console.log('✓ Schema loaded successfully');
    } catch (error) {
      console.error('Error loading schema:', error.message);
      throw error;
    }
  }

  getSchema() {
    return this.schema;
  }

  getSchemaForLLM() {
    if (!this.schema || !this.schema.tables) {
      return '';
    }

    let schemaText = 'DATABASE SCHEMA:\n\n';
    
    this.schema.tables.forEach(table => {
      schemaText += `Table: ${table.name}\n`;
      schemaText += `Description: ${table.description}\n`;
      schemaText += `Columns:\n`;
      
      table.columns.forEach(col => {
        schemaText += `  - ${col.name} (${col.type}): ${col.description}`;
        if (col.values) {
          schemaText += ` [Possible values: ${col.values.join(', ')}]`;
        }
        schemaText += '\n';
      });
      schemaText += '\n';
    });

    if (this.schema.exampleQueries) {
      schemaText += 'EXAMPLE QUERIES:\n\n';
      this.schema.exampleQueries.forEach((example, index) => {
        schemaText += `${index + 1}. Question: "${example.question}"\n`;
        schemaText += `   Intent: ${example.intent}\n\n`;
      });
    }

    return schemaText;
  }

  getColumns() {
    if (!this.schema || !this.schema.tables || this.schema.tables.length === 0) {
      return [];
    }
    return this.schema.tables[0].columns.map(col => col.name);
  }

  getColumnTypes() {
    if (!this.schema || !this.schema.tables || this.schema.tables.length === 0) {
      return {};
    }
    const types = {};
    this.schema.tables[0].columns.forEach(col => {
      types[col.name] = col.type;
    });
    return types;
  }
}

module.exports = new SchemaService();
