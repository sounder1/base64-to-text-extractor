# PDF Text Extractor Service

A Node.js web service that extracts text from PDF files sent as base64-encoded strings. Designed for integration with ServiceNow and deployment on Render.

## Features

- Accepts base64-encoded PDF data via HTTP POST requests
- Extracts text from PDF files automatically
- Returns extracted text in JSON format
- Health check endpoint for monitoring
- Ready for deployment on Render

## Installation

```bash
npm install
```

## Local Development

```bash
npm start
```

The server will start on port 3000 (or the port specified in the `PORT` environment variable).

## API Endpoints

### GET `/`
Returns service information and API documentation.

### GET `/health`
Health check endpoint. Returns `{ status: 'ok', message: 'PDF Extractor Service is running' }`.

### POST `/extract`
Extracts text from a base64-encoded PDF.

**Request Body:**
```json
{
  "base64": "JVBERi0xLjQK..."
}
```

You can also use any of these field names:
- `base64`
- `data`
- `pdf`
- `content`

**Response (Success):**
```json
{
  "success": true,
  "text": "Extracted text from PDF...",
  "length": 1234
}
```

**Response (Error):**
```json
{
  "success": false,
  "error": "Error message here"
}
```

## ServiceNow Integration

### Setting up the Flow in ServiceNow

1. **Create a REST Message:**
   - Navigate to `System Web Services > Outbound > REST Message`
   - Create a new REST message pointing to your Render service URL
   - Method: POST
   - Endpoint: `https://your-service.onrender.com/extract`

2. **Create a Flow:**
   - Use a Flow Designer or IntegrationHub flow
   - Add a REST step to call your PDF extractor service
   - Send the base64 PDF data in the request body:
     ```json
     {
       "base64": "{{base64_pdf_data}}"
     }
     ```

3. **Process the Response:**
   - The service returns the extracted text in the `text` field
   - Use this text in your ServiceNow workflow as needed

### Example ServiceNow REST Call

```javascript
// In ServiceNow REST Message
var requestBody = {
    "base64": base64PDFString
};

var response = sn_ws.RESTMessageV2(
    'PDF Extractor Service',
    'extract'
).setRequestBody(JSON.stringify(requestBody)).execute();

var responseBody = JSON.parse(response.getBody());
var extractedText = responseBody.text;
```

## Deployment on Render

### Option 1: Using render.yaml (Recommended)

1. Push your code to a Git repository (GitHub, GitLab, etc.)
2. In Render dashboard, click "New" → "Blueprint"
3. Connect your repository
4. Render will automatically detect the `render.yaml` file and deploy

### Option 2: Manual Setup

1. In Render dashboard, click "New" → "Web Service"
2. Connect your Git repository
3. Configure:
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Environment:** Node
   - **Port:** 10000 (or leave default)

### Environment Variables

No environment variables are required, but you can set:
- `PORT`: Port number (defaults to 3000 locally, Render sets this automatically)
- `NODE_ENV`: Set to `production` for production deployments

## Testing

### Using cURL

```bash
curl -X POST http://localhost:3000/extract \
  -H "Content-Type: application/json" \
  -d '{"base64": "JVBERi0xLjQK..."}'
```

### Using Postman

1. Method: POST
2. URL: `http://localhost:3000/extract`
3. Headers: `Content-Type: application/json`
4. Body (raw JSON):
   ```json
   {
     "base64": "your_base64_pdf_string_here"
   }
   ```

## Project Structure

```
.
├── server.js                      # Express web server
├── extractPdfTextFromBase64.js   # PDF extraction logic
├── package.json                   # Dependencies and scripts
├── render.yaml                   # Render deployment configuration
└── README.md                     # This file
```

## Dependencies

- **express**: Web framework for Node.js
- **pdf-parse**: PDF parsing library

## License

MIT
