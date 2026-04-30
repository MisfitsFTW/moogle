const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');
const dataService = require('../services/dataService');
const multer = require('multer');

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, '../data/uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
            cb(null, true);
        } else {
            cb(new Error('Only CSV files are allowed'), false);
        }
    }
}).single('csvFile');

class UploadController {
    async uploadCSV(req, res) {
        upload(req, res, async (err) => {
            if (err) {
                return res.status(400).json({
                    success: false,
                    error: 'File upload failed',
                    details: err.message
                });
            }

            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    error: 'No file uploaded'
                });
            }

            try {
                const filePath = req.file.path;
                const tableName = req.body.tableName || path.parse(req.file.originalname).name;
                
                // Sanitize table name (replace non-alphanumeric with underscore)
                const sanitizedTableName = tableName.replace(/[^a-zA-Z0-9]/g, '_');

                console.log(`\n📂 Processing CSV upload for table: "${sanitizedTableName}"`);

                const results = [];
                fs.createReadStream(filePath)
                    .pipe(csv())
                    .on('data', (data) => results.push(data))
                    .on('end', async () => {
                        try {
                            if (results.length === 0) {
                                throw new Error('CSV file is empty');
                            }

                            // 1. Process the upload in dataService
                            await dataService.processCSVUpload(sanitizedTableName, results);

                            // 2. Clean up uploaded file
                            fs.unlinkSync(filePath);

                            res.json({
                                success: true,
                                message: `Successfully uploaded ${results.length} records to table '${sanitizedTableName}'`,
                                tableName: sanitizedTableName,
                                recordCount: results.length
                            });
                        } catch (innerError) {
                            console.error('Error processing CSV data:', innerError);
                            // Clean up file if processing fails
                            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
                            
                            res.status(500).json({
                                success: false,
                                error: 'Failed to process CSV data',
                                details: innerError.message
                            });
                        }
                    });

            } catch (error) {
                console.error('Error in uploadCSV:', error);
                res.status(500).json({
                    success: false,
                    error: 'An unexpected error occurred',
                    details: error.message
                });
            }
        });
    }
}

module.exports = new UploadController();
