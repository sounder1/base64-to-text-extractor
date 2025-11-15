const express = require('express');
const { extractTextFromBase64 } = require('./extractPdfTextFromBase64');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON bodies
app.use(express.json({ limit: '50mb' })); // Increased limit for large base64 strings
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'PDF Extractor Service is running' });
});

// Main endpoint for PDF text extraction
// ServiceNow will automatically POST base64 PDF data to this endpoint when triggered by a flow
app.post('/extract', async (req, res) => {
  try {
    // ============================================
    // AUTOMATIC BASE64 RECEPTION FROM SERVICENOW
    // ============================================
    // ServiceNow sends base64 PDF data in the request body via POST
    // This line automatically extracts the base64 from the incoming request
    // ServiceNow can send it as "base64", "data", "pdf", or "content" field
    const base64 = req.body.base64 || req.body.data || req.body.pdf || req.body.content;
    
    if (!base64) {
      return res.status(400).json({
        success: false,
        error: 'Missing base64 data. Please provide base64 in the request body as "base64", "data", "pdf", or "content"'
      });
    }

    console.log('Received base64 PDF data, length:', base64.length);

    // Extract text from PDF automatically
    const extractedText = await extractTextFromBase64(base64);

    console.log('Extracted text length:', extractedText.length);

    // Return the extracted text back to ServiceNow automatically
    res.json({
      success: true,
      text: extractedText,
      length: extractedText.length
    });

  } catch (error) {
    console.error('Error extracting PDF text:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to extract text from PDF'
    });
  }
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'PDF Text Extractor',
    version: '1.0.0',
    endpoints: {
      health: 'GET /health',
      extract: 'POST /extract',
      description: 'Send POST request to /extract with base64 PDF data in the body'
    },
    example: {
      method: 'POST',
      url: '/extract',
      body: {
        base64: 'JVBERi0xLjQK...'
      }
    }
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`PDF Extractor Service is running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`Extract endpoint: POST http://localhost:${PORT}/extract`);
});

module.exports = app;

