# ServiceNow Automatic Integration Guide

## How the Automatic Flow Works

The PDF Extractor service **automatically receives** base64 PDF data from ServiceNow when configured properly. Here's how it works:

### Flow Diagram

```
ServiceNow Event/Trigger
    ↓
ServiceNow Flow (automatically triggered)
    ↓
REST API Call (automatically sends base64)
    ↓
Your Render Service (automatically receives at /extract)
    ↓
Extracts Text (automatically processes)
    ↓
Returns Text (automatically sends back)
    ↓
ServiceNow Flow (automatically receives response)
    ↓
ServiceNow Action (automatically processes text)
```

## Step-by-Step Setup in ServiceNow

### 1. Create REST Message (One-time setup)

1. Navigate to: **System Web Services > Outbound > REST Message**
2. Click **New**
3. Configure:
   - **Name**: `PDF Text Extractor`
   - **Endpoint**: `https://your-service-name.onrender.com`
   - **Authentication Type**: None (or Basic if you add auth later)

4. Create HTTP Method:
   - Click **HTTP Methods** tab → **New**
   - **HTTP Method**: `POST`
   - **Name**: `extract`
   - **Endpoint**: `/extract`
   - **HTTP Version**: `1.1`

### 2. Create Flow to Automatically Send Base64

#### Option A: Flow Designer (Recommended)

1. Navigate to: **Flow Designer** or **IntegrationHub Designer**
2. Create a new Flow
3. **Trigger**: Choose when you want it to automatically trigger:
   - **Record Created** (when a record with PDF attachment is created)
   - **Record Updated** (when PDF is attached)
   - **Scheduled** (periodic check)
   - **Custom Event** (your custom trigger)

4. Add Actions:
   
   **Step 1: Get Base64 from Attachment**
   ```
   Action: Get Attachment Content
   - Attachment Sys ID: {{trigger.attachment_sys_id}}
   - Output: base64_content
   ```

   **Step 2: Call PDF Extractor Service**
   ```
   Action: REST API Call
   - REST Message: PDF Text Extractor
   - HTTP Method: extract
   - Request Body:
     {
       "base64": "{{base64_content}}"
     }
   ```

   **Step 3: Save Extracted Text**
   ```
   Action: Update Record
   - Table: Your Table
   - Record: {{trigger.sys_id}}
   - Field: extracted_text
   - Value: {{rest_response.body.text}}
   ```

#### Option B: Script Include (For Advanced Users)

Create a Script Include that ServiceNow can call automatically:

```javascript
var PDFExtractorService = Class.create();
PDFExtractorService.prototype = {
    initialize: function() {
        this.restMessage = 'PDF Text Extractor';
        this.endpoint = '/extract';
    },

    extractTextFromBase64: function(base64Data) {
        try {
            var request = new sn_ws.RESTMessageV2(this.restMessage, this.endpoint);
            request.setRequestBody(JSON.stringify({
                base64: base64Data
            }));
            
            var response = request.execute();
            var responseBody = JSON.parse(response.getBody());
            
            if (responseBody.success) {
                return responseBody.text;
            } else {
                throw new Error(responseBody.error);
            }
        } catch (error) {
            gs.error('PDF Extraction Error: ' + error.message);
            throw error;
        }
    },

    type: 'PDFExtractorService'
};
```

### 3. Automatic Trigger Examples

#### Example 1: Auto-extract when PDF is attached to Incident

**Flow Configuration:**
- **Trigger**: Record Updated (Incident table)
- **Condition**: `attachment.name` ends with `.pdf`
- **Action**: 
  1. Get attachment base64
  2. Call PDF extractor
  3. Update incident with extracted text

#### Example 2: Scheduled extraction (every hour)

**Flow Configuration:**
- **Trigger**: Scheduled (runs every hour)
- **Condition**: Find records with PDF attachments not yet processed
- **Action**: 
  1. Loop through records
  2. Get base64 for each PDF
  3. Call extractor service
  4. Save extracted text

#### Example 3: Webhook from external system

**Flow Configuration:**
- **Trigger**: Inbound REST API (Webhook)
- **Action**:
  1. Receive base64 in webhook payload
  2. Call PDF extractor service
  3. Return extracted text in webhook response

## Where Base64 is Automatically Received in the Code

In `server.js`, line 20:

```javascript
// This line automatically receives base64 from ServiceNow POST request
const base64 = req.body.base64 || req.body.data || req.body.pdf || req.body.content;
```

**How it works:**
1. ServiceNow Flow automatically sends HTTP POST request to `/extract`
2. Express middleware (`express.json()`) automatically parses the JSON body
3. The base64 is automatically extracted from `req.body`
4. The service automatically processes it and returns the text

## Testing the Automatic Flow

### Test 1: Manual Trigger from ServiceNow

1. In ServiceNow, create a test record with PDF attachment
2. Manually run your flow
3. Check if text is extracted automatically

### Test 2: Using ServiceNow REST API Explorer

1. Navigate to: **System Web Services > REST > REST API Explorer**
2. Select your REST Message: `PDF Text Extractor`
3. Set HTTP Method: `POST`
4. Set Endpoint: `/extract`
5. Add Request Body:
   ```json
   {
     "base64": "JVBERi0xLjQK..."
   }
   ```
6. Click **Send Request**
7. Verify response contains extracted text

### Test 3: Using cURL (from ServiceNow Script)

```javascript
// In ServiceNow Background Script
var request = new sn_ws.RESTMessageV2();
request.setHttpMethod('POST');
request.setEndpoint('https://your-service.onrender.com/extract');
request.setRequestBody(JSON.stringify({
    base64: 'your_base64_here'
}));

var response = request.execute();
gs.print('Response: ' + response.getBody());
```

## Troubleshooting

### ServiceNow not sending automatically?

1. **Check Flow is Active**: Ensure flow is published and active
2. **Check Trigger Conditions**: Verify trigger conditions are met
3. **Check REST Message**: Verify endpoint URL is correct
4. **Check Logs**: Review ServiceNow logs for errors

### Service not receiving base64?

1. **Check Render Service**: Verify service is running on Render
2. **Check Endpoint**: Verify `/extract` endpoint is accessible
3. **Check Request Format**: Ensure ServiceNow sends JSON with base64 field
4. **Check Logs**: Review Render service logs

## Complete Automatic Flow Example

Here's a complete example of an automatic flow in ServiceNow:

**Scenario**: When a PDF is attached to an Incident, automatically extract text and save it.

**Flow Steps:**
1. **Trigger**: Incident Updated (when attachment added)
2. **Condition**: `current.attachments.size() > 0` AND attachment is PDF
3. **Action 1**: Get latest PDF attachment
4. **Action 2**: Convert attachment to base64
5. **Action 3**: REST API Call to your Render service
   - URL: `https://your-service.onrender.com/extract`
   - Method: POST
   - Body: `{"base64": "{{attachment_base64}}"}`
6. **Action 4**: Update Incident
   - Field: `work_notes`
   - Value: `Extracted Text: {{rest_response.body.text}}`

This flow runs **automatically** whenever a PDF is attached - no manual intervention needed!

