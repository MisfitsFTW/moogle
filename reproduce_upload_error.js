const sql = require('mssql');
const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');
require('dotenv').config();

const dataService = require('./services/dataService');

async function testUpload() {
    const filePath = 'c:\\gitLocal\\moogle\\data\\uploads\\MEEC_LaptopsAmsImport.csv';
    const results = [];
    
    console.log('Reading CSV...');
    fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', async () => {
            console.log(`CSV read complete. Rows: ${results.length}`);
            try {
                await dataService.processCSVUpload('TEST_MEEC_Laptops', results);
                console.log('SUCCESS: Table created and data inserted.');
                process.exit(0);
            } catch (err) {
                console.error('FAILURE:', err);
                process.exit(1);
            }
        });
}

testUpload();
