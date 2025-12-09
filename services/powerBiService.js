const axios = require('axios');
const qs = require('querystring');

/**
 * Service for interacting with Power BI REST API
 * 
 * AUTHENTICATION EXPLANATION:
 * Power BI requires an Azure AD (Entra ID) OAuth2 token to authorize API requests.
 * We use the "Client Credentials" flow (Service Principal) because this is a server-side application
 * acting on its own behalf, not on behalf of a specific signed-in user.
 * 
 * 1. We send Client ID + Client Secret + Tenant ID to https://login.microsoftonline.com/{tenant_id}/oauth2/v2.0/token
 * 2. Microsoft validates these credentials and returns a short-lived "Access Token" (Bearer token).
 * 3. We include this token in the 'Authorization' header of every request to Power BI API.
 */
class PowerBiService {
    constructor() {
        this.token = null;
        this.tokenExpiresAt = 0;
    }

    /**
     * Get a valid Access Token for Power BI
     */
    async getAccessToken() {
        // Check if we have a valid cached token (with 5 minute buffer)
        if (this.token && Date.now() < this.tokenExpiresAt - 5 * 60 * 1000) {
            return this.token;
        }

        const tenantId = process.env.POWER_BI_TENANT_ID;
        const clientId = process.env.POWER_BI_CLIENT_ID;
        const clientSecret = process.env.POWER_BI_CLIENT_SECRET;

        if (!tenantId || !clientId || !clientSecret) {
            throw new Error('Power BI credentials not configured in .env');
        }

        const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;

        const data = {
            grant_type: 'client_credentials',
            client_id: clientId,
            client_secret: clientSecret,
            scope: 'https://analysis.windows.net/powerbi/api/.default'
        };

        try {
            console.log('Authenticating with Power BI...');
            const response = await axios.post(tokenUrl, qs.stringify(data), {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            });

            this.token = response.data.access_token;
            // Set expiration based on expires_in (usually 3600 seconds)
            this.tokenExpiresAt = Date.now() + (response.data.expires_in * 1000);

            console.log('✓ Power BI Access Token acquired');
            return this.token;
        } catch (error) {
            console.error('Failed to authenticate with Power BI:', error.response?.data || error.message);
            throw new Error('Power BI Authentication Failed');
        }
    }

    /**
     * Fetch the dataset schema (tables and columns) using DMVs
     */
    async getSchema() {
        try {
            // Query to get Tables
            const tablesQuery = "SELECT [Name] FROM $SYSTEM.TMSCHEMA_TABLES WHERE [Name] <> 'DateTableTemplate_Md'";
            const tables = await this.executeQuery(tablesQuery);

            // Query to get Columns
            const columnsQuery = "SELECT [TableID], [Name], [ExplicitName] FROM $SYSTEM.TMSCHEMA_COLUMNS";
            const columns = await this.executeQuery(columnsQuery);

            // Process and structure the schema
            // Note: This is a simplified mapping. In a real scenario, we'd join tables and columns properly.
            // Since DMVs return flat rows, we might need to do some mapping.
            // However, for simplicity, let's just return the raw lists or a formatted string for the LLM.

            return {
                tables: tables.map(t => t.Name),
                columns: columns.map(c => ({ tableId: c.TableID, name: c.Name })) // This might be hard to join without TableID mapping
            };
        } catch (error) {
            console.error('Failed to fetch schema:', error);
            return null;
        }
    }

    /**
     * Execute a DAX query against a Power BI Dataset
     * @param {string} daxQuery - The DAX query string
     * @returns {Promise<Array>} - The query results
     */
    async executeQuery(daxQuery) {
        const groupId = process.env.POWER_BI_GROUP_ID;
        const datasetId = process.env.POWER_BI_DATASET_ID;

        if (!groupId || !datasetId) {
            throw new Error('Power BI Group ID or Dataset ID not configured');
        }

        const token = await this.getAccessToken();
        const url = `https://api.powerbi.com/v1.0/myorg/groups/${groupId}/datasets/${datasetId}/executeQueries`;

        try {
            console.log('Executing DAX Query:', daxQuery);

            const response = await axios.post(url, {
                queries: [{ query: daxQuery }],
                serializerSettings: { includeNulls: true }
            }, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.data.results && response.data.results.length > 0) {
                // Power BI returns results in a specific structure: results[0].tables[0].rows
                const firstResult = response.data.results[0];
                if (firstResult.tables && firstResult.tables.length > 0) {
                    return firstResult.tables[0].rows;
                }
            }

            return [];
        } catch (error) {
            console.error('Power BI Query Error:', error.response?.data || error.message);
            throw new Error(`Power BI Query Failed: ${JSON.stringify(error.response?.data || error.message)}`);
        }
    }
}

module.exports = new PowerBiService();
