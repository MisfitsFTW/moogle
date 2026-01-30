const sql = require('mssql');

class DataService {
    constructor() {
        this.data = {};
        this.isLoaded = false;
        this.config = {
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            server: process.env.DB_SERVER,
            database: process.env.DB_DATABASE,
            options: {
                encrypt: false, // Use this for local SQL Server
                trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true'
            }
        };
    }

    async loadData() {
        console.log(`Connecting to SQL Server: ${this.config.server}...`);

        try {
            const pool = await sql.connect(this.config);
            console.log('✓ Connected to SQL Server');

            // Dynamically fetch all user tables
            const tablesResult = await pool.request().query("SELECT name FROM sys.tables");
            const tablesToFetch = tablesResult.recordset.map(r => r.name);

            console.log(`Found ${tablesToFetch.length} tables to load...`);

            for (const tableName of tablesToFetch) {
                try {
                    const result = await pool.request().query(`SELECT * FROM [${tableName}]`);
                    // Strip BOM characters from keys and values
                    const cleanedData = result.recordset.map(row => this._stripBOM(row));
                    this.data[tableName] = cleanedData;
                    console.log(`✓ Loaded table '${tableName}' from SQL with ${cleanedData.length} records (BOM cleaned)`);
                } catch (tableError) {
                    console.warn(`⚠ Could not load table '${tableName}':`, tableError.message);
                }
            }

            this.isLoaded = true;
            return this.data;
        } catch (error) {
            console.error('Error connecting to/loading data from SQL Server:', error);
            throw error;
        }
    }

    /**
     * Recursively strip UTF-8 BOM characters from object keys and string values
     */
    _stripBOM(obj) {
        if (typeof obj !== 'object' || obj === null) {
            if (typeof obj === 'string') {
                return obj.replace(/^\uFEFF/, '').replace(/^ï»¿/, '');
            }
            return obj;
        }

        if (Array.isArray(obj)) {
            return obj.map(item => this._stripBOM(item));
        }

        const newObj = {};
        for (let key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                const newKey = key.replace(/^\uFEFF/, '').replace(/^ï»¿/, '');
                newObj[newKey] = this._stripBOM(obj[key]);
            }
        }
        return newObj;
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
                // Group filters by column to handle OR logic within same column
                // e.g., Filter1 (Column A = Val1) OR Filter2 (Column A = Val2)
                const filtersByColumn = {};
                queryInstructions.filters.forEach(f => {
                    if (!filtersByColumn[f.column]) filtersByColumn[f.column] = [];
                    filtersByColumn[f.column].push(f);
                });

                results = results.filter(row => {
                    // Every column constraint must be satisfied (AND between different columns)
                    return Object.entries(filtersByColumn).every(([column, columnFilters]) => {
                        const positiveFilters = columnFilters.filter(f => !f.operator.startsWith('not'));
                        const negativeFilters = columnFilters.filter(f => f.operator.startsWith('not'));

                        const value = row[column];

                        // Match positive filters (OR-ed)
                        const matchesPositive = positiveFilters.length === 0 ||
                            positiveFilters.some(f => this._compare(value, f.value, f.operator));

                        // Match negative filters (AND-ed)
                        const matchesNegative = negativeFilters.length === 0 ||
                            negativeFilters.every(f => this._compare(value, f.value, f.operator));

                        return matchesPositive && matchesNegative;
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
            if (queryInstructions.columns && queryInstructions.columns.length > 0 && !queryInstructions.columns.includes('*')) {
                // Ensure aggregated columns (aliases) and groupBy columns are included if they exist
                const aggregateAliases = (queryInstructions.aggregate || []).map(agg => agg.alias || (agg.function === 'count' ? 'count' : `${agg.function}_${agg.column}`));
                const groupByCol = queryInstructions.groupBy ? [queryInstructions.groupBy] : [];
                const finalColumns = [...new Set([...queryInstructions.columns, ...aggregateAliases, ...groupByCol])];

                results = results.map(row => {
                    const filtered = {};
                    finalColumns.forEach(col => {
                        if (row.hasOwnProperty(col)) {
                            filtered[col] = row[col];
                        }
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

    /**
     * Helper to compare values with support for numbers, dates, and strings
     */
    _compare(value, filterValue, operator) {
        if (value === null || value === undefined) return false;

        const strVal = value.toString().toLowerCase();
        const strFilter = filterValue.toString().toLowerCase();

        // Handle string-only operators first
        if (operator === 'contains') return strVal.includes(strFilter);
        if (operator === 'not_contains') return !strVal.includes(strFilter);

        // Try date comparison for range/equality
        const dateVal = new Date(value);
        const dateFilter = new Date(filterValue);

        const isDateString = (s) => typeof s === 'string' && (s.includes('-') || s.includes('/'));

        if (!isNaN(dateVal.getTime()) && !isNaN(dateFilter.getTime()) && (isDateString(value) || isDateString(filterValue))) {
            switch (operator) {
                case '>': return dateVal > dateFilter;
                case '<': return dateVal < dateFilter;
                case '>=': return dateVal >= dateFilter;
                case '<=': return dateVal <= dateFilter;
                case 'equals':
                case '=': return dateVal.getTime() === dateFilter.getTime();
                case 'not_equals':
                case '!=': return dateVal.getTime() !== dateFilter.getTime();
            }
        }

        // Try numeric comparison
        const cleanVal = (v) => {
            if (typeof v === 'number') return v;
            if (typeof v !== 'string') return NaN;
            // Remove everything except digits, dots, and minus signs
            const cleaned = v.replace(/[^\d.-]/g, '');
            return cleaned === '' ? NaN : parseFloat(cleaned);
        };

        const numVal = cleanVal(value);
        const numFilter = cleanVal(filterValue);

        if (!isNaN(numVal) && !isNaN(numFilter)) {
            switch (operator) {
                case '>': return numVal > numFilter;
                case '<': return numVal < numFilter;
                case '>=': return numVal >= numFilter;
                case '<=': return numVal <= numFilter;
                case 'equals':
                case '=': return numVal === numFilter;
                case 'not_equals':
                case '!=': return numVal !== numFilter;
            }
        }

        // Fallback to string equality
        switch (operator) {
            case 'equals':
            case '=': return strVal === strFilter;
            case 'not_equals':
            case '!=': return strVal !== strFilter;
            default: return true;
        }
    }
}

module.exports = new DataService();
