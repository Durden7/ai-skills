# Error Handling Guide: BytePlus SeeDream v4.5

Comprehensive guide for handling errors when using BytePlus SeeDream v4.5 API.

---

## Table of Contents

1. [HTTP Status Codes](#http-status-codes)
2. [Error Response Structure](#error-response-structure)
3. [Error Handling Strategy](#error-handling-strategy)
4. [Common Error Scenarios](#common-error-scenarios)
5. [Retry Logic](#retry-logic)
6. [Error Logging](#error-logging)

---

## HTTP Status Codes

BytePlus SeeDream v4.5 uses standard HTTP status codes to indicate success or failure.

### Success

**200 OK**
- Request succeeded
- Image generated successfully
- Response contains image data in `data[0].b64_json`

### Client Errors (4xx)

**400 Bad Request**
- **Cause:** Invalid request parameters
- **Common reasons:**
  - Invalid image format (not PNG/JPEG/WEBP/BMP/TIFF/GIF)
  - Image size exceeds 10MB
  - Image dimensions out of range (width/height <= 14px)
  - Aspect ratio out of range [1/16, 16]
  - Total pixels outside valid range
  - Missing required fields (model, prompt)
  - Invalid model ID
- **Action:** Validate inputs before sending request

**401 Unauthorized**
- **Cause:** Authentication failed
- **Common reasons:**
  - Missing API key in request header
  - Invalid API key
  - Expired API key
  - API key for wrong region/environment
- **Action:** Check `BYTEPLUS_API_KEY` environment variable

**429 Too Many Requests**
- **Cause:** Rate limit exceeded
- **Common reasons:**
  - Too many requests in short time window
  - Exceeded quota limits
- **Action:** Implement exponential backoff, retry after delay

### Server Errors (5xx)

**500 Internal Server Error**
- **Cause:** BytePlus service issue
- **Common reasons:**
  - Temporary service outage
  - Model processing error
  - Internal timeout
- **Action:** Retry with exponential backoff

**503 Service Unavailable**
- **Cause:** Service temporarily unavailable
- **Common reasons:**
  - Maintenance
  - High load
  - Deployment in progress
- **Action:** Retry after delay

---

## Error Response Structure

BytePlus returns errors in a consistent JSON format:

```typescript
{
  error: {
    code: string,      // Error code (e.g., "INVALID_ARGUMENT")
    message: string    // Human-readable error message
  }
}
```

**Example error responses:**

```json
{
  "error": {
    "code": "INVALID_ARGUMENT",
    "message": "Image format not supported. Use PNG, JPEG, or WEBP."
  }
}
```

```json
{
  "error": {
    "code": "UNAUTHENTICATED",
    "message": "Invalid API key provided"
  }
}
```

```json
{
  "error": {
    "code": "RESOURCE_EXHAUSTED",
    "message": "Rate limit exceeded. Please retry after 60 seconds."
  }
}
```

---

## Error Handling Strategy

### Level 1: Input Validation (Prevent Errors)

Validate inputs **before** making API calls to catch issues early.

```typescript
function validateGenerationParams(params: BytePlusGenerateParams): string | null {
  // Validate prompt
  if (!params.prompt || params.prompt.trim().length === 0) {
    return "Prompt is required"
  }

  if (params.prompt.length > 10000) {
    return "Prompt too long (max 10,000 characters)"
  }

  // Validate images
  if (params.images.length > 14) {
    return "Too many images (max 14)"
  }

  for (const img of params.images) {
    // Check MIME type
    const validTypes = ["image/png", "image/jpeg", "image/webp", "image/bmp", "image/tiff", "image/gif"]
    if (!validTypes.includes(img.mimeType)) {
      return `Unsupported image format: ${img.mimeType}`
    }

    // Check base64 is not empty
    if (!img.data || img.data.length === 0) {
      return "Empty image data"
    }

    // Rough size check (base64 is ~1.33x original size)
    const estimatedSize = (img.data.length * 0.75) / (1024 * 1024)  // MB
    if (estimatedSize > 10) {
      return `Image too large (${estimatedSize.toFixed(1)}MB, max 10MB)`
    }
  }

  return null  // No errors
}

// Use before API call
const validationError = validateGenerationParams(params)
if (validationError) {
  return { error: validationError }
}
```

### Level 2: API Error Handling (Handle Failures)

Handle HTTP errors with appropriate user messages and retry logic.

```typescript
async function handleBytePlusResponse(response: Response): Promise<GenerateResult> {
  if (!response.ok) {
    const errorData: BytePlusError = await response.json()
    
    switch (response.status) {
      case 400:
        // Bad Request - User error, don't retry
        console.error("[BytePlus] 400 Bad Request:", errorData.error?.message)
        
        // Parse specific error types
        if (errorData.error?.message?.includes("image format")) {
          return { error: "Unsupported image format. Use PNG, JPEG, or WEBP." }
        }
        if (errorData.error?.message?.includes("size")) {
          return { error: "Image size exceeds limits. Max 10MB per image." }
        }
        if (errorData.error?.message?.includes("aspect ratio")) {
          return { error: "Image aspect ratio out of range [1/16, 16]." }
        }
        
        return { error: "Invalid request: " + errorData.error?.message }
      
      case 401:
        // Unauthorized - Configuration error, don't retry
        console.error("[BytePlus] 401 Unauthorized")
        return { 
          error: "API key invalid. Check your BYTEPLUS_API_KEY environment variable." 
        }
      
      case 429:
        // Rate Limit - Retry with backoff
        console.error("[BytePlus] 429 Rate Limit Exceeded")
        
        // Extract retry-after header if available
        const retryAfter = response.headers.get("Retry-After")
        const retrySeconds = retryAfter ? parseInt(retryAfter) : 60
        
        return { 
          error: `Rate limit exceeded. Please wait ${retrySeconds} seconds and try again.` 
        }
      
      case 500:
        // Internal Error - Retry with backoff
        console.error("[BytePlus] 500 Internal Server Error")
        return { 
          error: "BytePlus service temporarily unavailable. Please retry." 
        }
      
      case 503:
        // Service Unavailable - Retry with backoff
        console.error("[BytePlus] 503 Service Unavailable")
        return { 
          error: "Service temporarily unavailable. Please retry in a few minutes." 
        }
      
      default:
        // Unknown error
        console.error("[BytePlus] Unknown error:", response.status, errorData)
        return { 
          error: errorData.error?.message || `Request failed with status ${response.status}` 
        }
    }
  }

  // Success - parse response
  const result: BytePlusResponse = await response.json()
  
  // Validate response has data
  if (!result.data || result.data.length === 0) {
    console.error("[BytePlus] Empty response data")
    return { error: "No image was generated. Try a different prompt." }
  }

  if (!result.data[0].b64_json) {
    console.error("[BytePlus] Missing image data in response")
    return { error: "No image data in response" }
  }

  return {
    imageUrl: `data:image/jpeg;base64,${result.data[0].b64_json}`,
    usage: result.usage
  }
}
```

### Level 3: Exception Handling (Catch Unexpected Errors)

Wrap all API calls in try-catch to handle network errors and unexpected exceptions.

```typescript
async function generateImageWithByteplus(
  params: BytePlusGenerateParams
): Promise<GenerateResult> {
  try {
    // Validate inputs
    const validationError = validateGenerationParams(params)
    if (validationError) {
      return { error: validationError }
    }

    // Check API key
    if (!process.env.BYTEPLUS_API_KEY) {
      return { error: "BytePlus API key not configured" }
    }

    // Make API request
    const response = await fetch(BYTEPLUS_ENDPOINT, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.BYTEPLUS_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "seedream-4-5-251128",
        prompt: params.prompt,
        image: params.images.map(img => 
          `data:${img.mimeType};base64,${img.data}`
        ),
        size: "2048x2560",
        sequential_image_generation: "disabled",
        watermark: false,
        response_format: "b64_json",
        optimize_prompt_options: {
          mode: "standard"
        }
      })
    })

    // Handle response
    return await handleBytePlusResponse(response)

  } catch (error) {
    // Catch network errors, JSON parse errors, etc.
    console.error("[BytePlus] Unexpected error:", error)
    
    // Check for specific error types
    if (error instanceof TypeError && error.message.includes("fetch")) {
      return { error: "Network error. Check your internet connection." }
    }
    
    if (error instanceof SyntaxError) {
      return { error: "Invalid response from server. Please retry." }
    }
    
    // Generic error
    return { 
      error: error instanceof Error ? error.message : "Failed to generate image" 
    }
  }
}
```

---

## Common Error Scenarios

### Scenario 1: Invalid API Key

**Error:**
```json
{
  "error": {
    "code": "UNAUTHENTICATED",
    "message": "Invalid API key provided"
  }
}
```

**Handling:**
```typescript
case 401:
  console.error("API key invalid")
  console.error("Current key:", process.env.BYTEPLUS_API_KEY?.substring(0, 10) + "...")
  console.error("Get key at: https://console.byteplus.com/ark/region:ark+ap-southeast-1/apiKey")
  return { error: "API key invalid. Check your BYTEPLUS_API_KEY." }
```

### Scenario 2: Image Too Large

**Error:**
```json
{
  "error": {
    "code": "INVALID_ARGUMENT",
    "message": "Image size exceeds 10MB limit"
  }
}
```

**Prevention:**
```typescript
// Validate before API call
const imageSize = (base64Data.length * 0.75) / (1024 * 1024)  // MB
if (imageSize > 10) {
  return { error: `Image too large: ${imageSize.toFixed(1)}MB (max 10MB)` }
}

// Or compress image
const compressedBase64 = await compressImage(base64Data, 10 * 1024 * 1024)
```

### Scenario 3: Unsupported Format

**Error:**
```json
{
  "error": {
    "code": "INVALID_ARGUMENT",
    "message": "Unsupported image format: image/svg+xml"
  }
}
```

**Prevention:**
```typescript
const supportedFormats = [
  "image/png",
  "image/jpeg", 
  "image/webp",
  "image/bmp",
  "image/tiff",
  "image/gif"
]

if (!supportedFormats.includes(mimeType)) {
  return { error: `Unsupported format: ${mimeType}. Use PNG, JPEG, or WEBP.` }
}
```

### Scenario 4: Rate Limit Exceeded

**Error:**
```json
{
  "error": {
    "code": "RESOURCE_EXHAUSTED",
    "message": "Rate limit exceeded. Retry after 60 seconds."
  }
}
```

**Handling:**
```typescript
case 429:
  const retryAfter = response.headers.get("Retry-After") || "60"
  console.warn(`Rate limited. Retry after ${retryAfter} seconds`)
  
  // Option 1: Return error with retry time
  return { 
    error: `Too many requests. Please wait ${retryAfter} seconds.`,
    retryAfter: parseInt(retryAfter)
  }
  
  // Option 2: Auto-retry after delay (if in background job)
  await sleep(parseInt(retryAfter) * 1000)
  return generateImageWithByteplus(params)  // Retry
```

### Scenario 5: Content Filter Rejection

**Error:**
```json
{
  "error": {
    "code": "FAILED_PRECONDITION",
    "message": "Content filtered: prompt violates usage policy"
  }
}
```

**Handling:**
```typescript
if (errorData.error?.code === "FAILED_PRECONDITION" || 
    errorData.error?.message?.includes("filtered")) {
  return { 
    error: "Image generation blocked by content filter. Please modify your prompt." 
  }
}
```

---

## Retry Logic

Implement exponential backoff for transient errors (5xx, 429).

```typescript
async function generateWithRetry(
  params: BytePlusGenerateParams,
  maxRetries = 3
): Promise<GenerateResult> {
  let lastError: string = ""
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    console.log(`[BytePlus] Attempt ${attempt + 1}/${maxRetries}`)
    
    const result = await generateImageWithByteplus(params)
    
    // Success
    if (result.imageUrl) {
      return result
    }
    
    // Check if error is retryable
    const isRetryable = 
      result.error?.includes("service error") ||
      result.error?.includes("temporarily unavailable") ||
      result.error?.includes("rate limit")
    
    if (!isRetryable) {
      // Don't retry client errors (4xx except 429)
      console.log("[BytePlus] Non-retryable error, giving up")
      return result
    }
    
    lastError = result.error || "Unknown error"
    
    // Don't sleep on last attempt
    if (attempt < maxRetries - 1) {
      // Exponential backoff: 1s, 2s, 4s, 8s...
      const delayMs = Math.pow(2, attempt) * 1000
      console.log(`[BytePlus] Retrying in ${delayMs}ms...`)
      await sleep(delayMs)
    }
  }
  
  return { error: `Failed after ${maxRetries} attempts: ${lastError}` }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
```

---

## Error Logging

Implement comprehensive logging for debugging and monitoring.

```typescript
interface ErrorLogEntry {
  timestamp: string
  status?: number
  errorCode?: string
  errorMessage?: string
  requestParams: {
    promptLength: number
    imageCount: number
  }
  stack?: string
}

function logError(
  error: BytePlusError | Error,
  response?: Response,
  params?: BytePlusGenerateParams
): void {
  const logEntry: ErrorLogEntry = {
    timestamp: new Date().toISOString(),
    status: response?.status,
    errorCode: 'error' in error ? error.error?.code : undefined,
    errorMessage: 'error' in error ? error.error?.message : error.message,
    requestParams: {
      promptLength: params?.prompt?.length || 0,
      imageCount: params?.images?.length || 0
    },
    stack: error instanceof Error ? error.stack : undefined
  }
  
  // Log to console
  console.error("[BytePlus] Error occurred:", JSON.stringify(logEntry, null, 2))
  
  // Send to monitoring service (e.g., Sentry, DataDog)
  // sendToMonitoring(logEntry)
  
  // Write to error log file
  // fs.appendFileSync('errors.log', JSON.stringify(logEntry) + '\n')
}

// Usage in catch block
catch (error) {
  logError(error, response, params)
  return { error: "Failed to generate image" }
}
```

---

## Best Practices Summary

1. **Validate inputs before API calls** - Catch errors early
2. **Check API key availability** - Fail fast with clear message
3. **Map HTTP status codes** - Provide user-friendly error messages
4. **Implement retry logic** - Only for transient errors (5xx, 429)
5. **Use exponential backoff** - Prevent overwhelming the service
6. **Log errors comprehensively** - Include context for debugging
7. **Don't retry client errors** - 4xx (except 429) indicate user mistakes
8. **Extract retry-after header** - Respect rate limit timing
9. **Handle network errors** - Catch fetch exceptions
10. **Validate API responses** - Check for empty or malformed data

---

## Error Handling Checklist

Before deploying:

- [ ] All HTTP status codes handled (400, 401, 429, 500, 503)
- [ ] Input validation implemented
- [ ] API key validation implemented
- [ ] Retry logic for transient errors
- [ ] Exponential backoff configured
- [ ] Error logging implemented
- [ ] User-friendly error messages
- [ ] Network error handling
- [ ] Response validation
- [ ] Monitoring/alerting set up
