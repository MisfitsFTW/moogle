const fs = require('fs');
const path = require('path');
const Papa = require('papaparse');

class DataService {
    constructor() {
        this.data = [];
        this.isLoaded = false;
    }

    async loadData() {
        return new Promise((resolve, reject) => {
            const csvPath = process.env.CSV_DATA_PATH || path.join(__dirname, '../data/workers.csv');

            console.log(`Loading data from: ${csvPath}`);

            const fileContent = fs.readFileSync(csvPath, 'utf8');

            Papa.parse(fileContent, {
                header: true,
                skipEmptyLines: true,
                complete: (results) => {
                    this.data = results.data;
                    this.isLoaded = true;
                    console.log(`✓ Loaded ${this.data.length} worker records`);
                    resolve(this.data);
                },
                error: (error) => {
                    console.error('Error parsing CSV:', error);
                    reject(error);
                }
            });
        });
    }

    executeQuery(queryInstructions) {
        if (!this.isLoaded) {
            throw new Error('Data not loaded. Call loadData() first.');
        }

        let results = [...this.data];

        try {
            // Apply filters
            if (queryInstructions.filters && queryInstructions.filters.length > 0) {
                queryInstructions.filters.forEach(filter => {
                    results = results.filter(row => {
                        const value = row[filter.column];

                        switch (filter.operator) {
                            case 'equals':
                            case '=':
                                return value && value.toString().toLowerCase() === filter.value.toString().toLowerCase();
                            case 'contains':
                                return value && value.toString().toLowerCase().includes(filter.value.toString().toLowerCase());
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
                    const key = row[queryInstructions.groupBy];
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
        return this.data.length;
    }
}

module.exports = new DataService();
