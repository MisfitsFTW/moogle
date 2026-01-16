const fs = require('fs');
const path = require('path');
const Papa = require('papaparse');

class DataService {
    constructor() {
        this.data = {}; // Changed to object to hold multiple tables
        this.isLoaded = false;
    }

    async loadData() {
        const dataDir = path.join(__dirname, '../data');
        console.log(`Loading data from directory: ${dataDir}`);

        try {
            if (!fs.existsSync(dataDir)) {
                throw new Error(`Data directory not found: ${dataDir}`);
            }

            const files = fs.readdirSync(dataDir);
            const csvFiles = files.filter(file => file.toLowerCase().endsWith('.csv'));

            if (csvFiles.length === 0) {
                console.warn('No CSV files found in data directory');
                return {};
            }

            const loadPromises = csvFiles.map(file => {
                return new Promise((resolve, reject) => {
                    const filePath = path.join(dataDir, file);
                    const tableName = path.basename(file, '.csv');

                    const fileContent = fs.readFileSync(filePath, 'utf8');

                    Papa.parse(fileContent, {
                        header: true,
                        skipEmptyLines: true,
                        dynamicTyping: true,
                        complete: (results) => {
                            this.data[tableName] = results.data;
                            console.log(`✓ Loaded table '${tableName}' with ${results.data.length} records`);
                            resolve();
                        },
                        error: (error) => {
                            console.error(`Error parsing ${file}:`, error);
                            reject(error);
                        }
                    });
                });
            });

            await Promise.all(loadPromises);
            this.isLoaded = true;
            return this.data;
        } catch (error) {
            console.error('Error loading data:', error);
            throw error;
        }
    }

    executeQuery(queryInstructions, tableName) {
        if (!this.isLoaded) {
            throw new Error('Data not loaded. Call loadData() first.');
        }

        let targetData = null;
        const availableTables = Object.keys(this.data);

        // Determine which table to query
        if (tableName && this.data[tableName]) {
            targetData = this.data[tableName];
        } else if (!tableName && availableTables.length === 1) {
            // Default to the single table if only one exists
            targetData = this.data[availableTables[0]];
        } else {
            const errorMsg = tableName
                ? `Table '${tableName}' not found.`
                : 'Table name is required for multi-table datasets.';
            throw new Error(`${errorMsg} Available tables: ${availableTables.join(', ')}`);
        }

        let results = [...targetData];

        try {
            // Apply filters
            if (queryInstructions.filters && queryInstructions.filters.length > 0) {
                queryInstructions.filters.forEach(filter => {
                    results = results.filter(row => {
                        const value = row[filter.column];

                        // Handle null/undefined values safely
                        if (value === null || value === undefined) return false;

                        switch (filter.operator) {
                            case 'equals':
                            case '=':
                                return value.toString().toLowerCase() === filter.value.toString().toLowerCase();
                            case 'not_equals':
                            case '!=':
                                return value.toString().toLowerCase() !== filter.value.toString().toLowerCase();
                            case 'contains':
                                return value.toString().toLowerCase().includes(filter.value.toString().toLowerCase());
                            case 'not_contains':
                                return !value.toString().toLowerCase().includes(filter.value.toString().toLowerCase());
                            case '>':
                                return parseFloat(value) > parseFloat(filter.value);
                            case '<':
                                return parseFloat(value) < parseFloat(filter.value);
                            case '>=':
                                return parseFloat(value) >= parseFloat(filter.value);
                            case '<=':
                                return parseFloat(value) <= parseFloat(filter.value);
                            default:
                                return true;
                        }
                    });
                });
            }

            // Apply sorting
            if (queryInstructions.sort) {
                const { column, direction } = queryInstructions.sort;
                results.sort((a, b) => {
                    const aVal = a[column];
                    const bVal = b[column];

                    if (aVal === null || aVal === undefined) return 1;
                    if (bVal === null || bVal === undefined) return -1;

                    // Try numeric comparison first
                    const aNum = parseFloat(aVal);
                    const bNum = parseFloat(bVal);

                    if (!isNaN(aNum) && !isNaN(bNum)) {
                        return direction === 'desc' ? bNum - aNum : aNum - bNum;
                    }

                    // String comparison
                    const comparison = aVal.toString().localeCompare(bVal.toString());
                    return direction === 'desc' ? -comparison : comparison;
                });
            }

            // Apply grouping and aggregation
            if (queryInstructions.groupBy) {
                const grouped = {};
                results.forEach(row => {
                    const key = row[queryInstructions.groupBy] || 'Unknown';
                    if (!grouped[key]) {
                        grouped[key] = [];
                    }
                    grouped[key].push(row);
                });

                results = Object.keys(grouped).map(key => {
                    const group = grouped[key];
                    const result = { [queryInstructions.groupBy]: key };

                    if (queryInstructions.aggregate) {
                        queryInstructions.aggregate.forEach(agg => {
                            if (agg.function === 'count') {
                                result[agg.alias || 'count'] = group.length;
                            } else if (agg.function === 'sum') {
                                result[agg.alias || `sum_${agg.column}`] = group.reduce((sum, row) =>
                                    sum + (parseFloat(row[agg.column]) || 0), 0);
                            } else if (agg.function === 'avg') {
                                const sum = group.reduce((sum, row) => sum + (parseFloat(row[agg.column]) || 0), 0);
                                result[agg.alias || `avg_${agg.column}`] = sum / group.length;
                            }
                        });
                    }

                    return result;
                });
            }

            // Apply limit
            if (queryInstructions.limit) {
                results = results.slice(0, queryInstructions.limit);
            }

            // Select specific columns
            if (queryInstructions.columns && queryInstructions.columns.length > 0) {
                results = results.map(row => {
                    const filtered = {};
                    queryInstructions.columns.forEach(col => {
                        filtered[col] = row[col];
                    });
                    return filtered;
                });
            }

            return results;
        } catch (error) {
            console.error('Error executing query:', error);
            throw error;
        }
    }

    getAllData() {
        return this.data;
    }

    getDataCount() {
        const counts = {};
        for (const [table, rows] of Object.entries(this.data)) {
            counts[table] = rows.length;
        }
        return counts;
    }
}

module.exports = new DataService();
