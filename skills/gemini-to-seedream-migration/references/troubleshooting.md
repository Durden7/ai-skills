# Troubleshooting Guide: BytePlus SeeDream v4.5

Common issues and solutions when migrating from Gemini to BytePlus SeeDream v4.5.

---

## Table of Contents

1. [Authentication Issues](#authentication-issues)
2. [Image Format Problems](#image-format-problems)
3. [Generation Failures](#generation-failures)
4. [Quality Issues](#quality-issues)
5. [Performance Problems](#performance-problems)
6. [Integration Issues](#integration-issues)
7. [Debugging Tips](#debugging-tips)

---

## Authentication Issues

### Issue 1: "BytePlus API authentication failed"

**Symptoms:**
- API returns 401 status code
- Error message: "BytePlus API authentication failed"
- Requests immediately fail

**Causes:**
- Invalid or missing API key
- API key for wrong region
- Expired API key
- API key not activated

**Solutions:**

1. **Check environment variable:**
   ```bash
   # Verify key is set
   echo $BYTEPLUS_API_KEY  # Linux/Mac
   echo %BYTEPLUS_API_KEY%  # Windows
   ```

2. **Verify key in code:**
   ```typescript
   console.log("API Key present:", !!process.env.BYTEPLUS_API_KEY)
   console.log("API Key prefix:", process.env.BYTEPLUS_API_KEY?.substring(0, 10))
   ```

3. **Check .env.local file:**
   ```bash
   cat .env.local | grep BYTEPLUS
   # Should show: BYTEPLUS_API_KEY=your_key_here
   ```

4. **Regenerate API key:**
   - Visit https://console.byteplus.com/ark/region:ark+ap-southeast-1/apiKey
   - Generate new API key
   - Update `.env.local`
   - Restart dev server

5. **Check key activation:**
   - Log in to BytePlus console
   - Verify API key is active (not disabled/expired)
   - Check key permissions

6. **Verify region:**
   - Ensure using correct regional endpoint
   - Default: `ark.ap-southeast.bytepluses.com`
   - Match key region with endpoint region

### Issue 2: "API key not configured"

**Symptoms:**
- Error before API call is made
- Error message: "BytePlus API key not configured"

**Causes:**
- Missing `.env.local` file
- Wrong variable name
- Environment variable not loaded

**Solutions:**

1. **Create .env.local:**
   ```bash
   cp .env.example .env.local
   # Edit .env.local and add key
   ```

2. **Check variable name:**
   ```bash
   # Should be BYTEPLUS_API_KEY (not BYTEPLUS_KEY or BYTEPLUS_API)
   BYTEPLUS_API_KEY=your_key_here
   ```

3. **Restart server:**
   ```bash
   # Stop dev server (Ctrl+C)
   npm run dev
   ```

4. **Check Next.js env loading:**
   ```typescript
   // In API route
   console.log("All env vars:", Object.keys(process.env))
   ```

---

## Image Format Problems

### Issue 3: "Invalid image or prompt"

**Symptoms:**
- API returns 400 status code
- Error message mentions image format or size

**Causes:**
- Unsupported image format
- Image too large (>10MB)
- Corrupted base64 data
- Wrong data URI format

**Solutions:**

1. **Check image format:**
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
     console.error("Unsupported format:", mimeType)
   }
   ```

2. **Check image size:**
   ```typescript
   // Base64 is ~1.33x original size
   const estimatedSize = (base64Data.length * 0.75) / (1024 * 1024)
   console.log("Estimated size:", estimatedSize.toFixed(2), "MB")
   
   if (estimatedSize > 10) {
     console.error("Image too large:", estimatedSize, "MB")
   }
   ```

3. **Validate base64:**
   ```typescript
   // Check base64 is valid
   try {
     atob(base64Data)  // Browser
     // or Buffer.from(base64Data, 'base64')  // Node
   } catch (error) {
     console.error("Invalid base64:", error)
   }
   ```

4. **Compress large images:**
   ```typescript
   // Use image compression library
   import imageCompression from 'browser-image-compression'
   
   const compressed = await imageCompression(file, {
     maxSizeMB: 10,
     maxWidthOrHeight: 4096
   })
   ```

### Issue 4: "Data URI format error"

**Symptoms:**
- API returns 400
- Generation fails with format error

**Cause:**
- Sending plain base64 instead of data URI format

**Solution:**

Ensure images are formatted as data URIs:

```typescript
// ❌ WRONG: Plain base64
const imageData = "iVBORw0KGg..."

// ✅ CORRECT: Data URI format
const imageData = "data:image/png;base64,iVBORw0KGg..."

// Conversion
const dataUri = `data:${mimeType};base64,${base64String}`
```

**In client code:**
```typescript
// Input to function: plain base64
images: [{ data: base64String, mimeType: "image/png" }]

// Inside function: convert to data URI
const imageDataUris = params.images.map(img => 
  `data:${img.mimeType};base64,${img.data}`
)
```

---

## Generation Failures

### Issue 5: "No image was generated"

**Symptoms:**
- API returns 200 but no image data
- Empty `data` array in response

**Causes:**
- Content filtered by safety system
- Prompt violates usage policy
- Image processing failed
- Input images inappropriate

**Solutions:**

1. **Simplify prompt:**
   ```typescript
   // Try simple, neutral prompt
   const testPrompt = "A simple red circle on white background"
   ```

2. **Check for content filter:**
   ```typescript
   if (!result.data || result.data.length === 0) {
     console.error("Possibly filtered by content policy")
     return { error: "Image generation blocked. Please modify your prompt." }
   }
   ```

3. **Test without input images:**
   ```typescript
   // Try text-to-image only
   const result = await generateImageWithByteplus({
     prompt: "A simple test image",
     images: []  // No input images
   })
   ```

4. **Review BytePlus usage policy:**
   - Check https://www.byteplus.com/en/terms
   - Avoid restricted content types
   - Use appropriate prompts

### Issue 6: "Wrong model ID error"

**Symptoms:**
- API returns error about unknown model
- Error message mentions model ID

**Cause:**
- Using `seedream-4.5` instead of exact version ID

**Solution:**

Use exact model ID:
```typescript
// ❌ WRONG
model: "seedream-4.5"

// ✅ CORRECT
model: "seedream-4-5-251128"
```

Check latest model ID in BytePlus docs:
https://docs.byteplus.com/en/docs/ModelArk/1330310#image-generation

### Issue 7: "Rate limit exceeded"

**Symptoms:**
- API returns 429 status
- Error message: "Rate limit exceeded"
- Requests blocked after multiple calls

**Causes:**
- Too many requests in short time
- Exceeded quota limits
- No retry backoff implemented

**Solutions:**

1. **Check rate limits:**
   - Review BytePlus pricing/limits page
   - Check your account quota
   - Verify requests per minute/hour limits

2. **Implement exponential backoff:**
   ```typescript
   async function generateWithRetry(params, maxRetries = 3) {
     for (let i = 0; i < maxRetries; i++) {
       const result = await generateImageWithByteplus(params)
       
       if (result.imageUrl) return result
       
       if (result.error?.includes("rate limit")) {
         const delay = Math.pow(2, i) * 1000  // 1s, 2s, 4s...
         console.log(`Waiting ${delay}ms before retry...`)
         await new Promise(resolve => setTimeout(resolve, delay))
         continue
       }
       
       return result  // Non-retryable error
     }
   }
   ```

3. **Check Retry-After header:**
   ```typescript
   if (response.status === 429) {
     const retryAfter = response.headers.get("Retry-After")
     console.log("Retry after:", retryAfter, "seconds")
   }
   ```

4. **Request quota increase:**
   - Contact BytePlus support
   - Request higher rate limits
   - Upgrade plan if available

---

## Quality Issues

### Issue 8: Image quality lower than Gemini

**Symptoms:**
- Generated images less detailed
- Colors less accurate
- Overall quality feels worse

**Causes:**
- Using "fast" optimization mode
- Lower resolution setting
- Different model characteristics

**Solutions:**

1. **Use standard optimization:**
   ```typescript
   optimize_prompt_options: {
     mode: "standard"  // Not "fast"
   }
   ```

2. **Increase resolution:**
   ```typescript
   // Try higher resolution
   size: "4K"  // Instead of "2K"
   // or exact pixels
   size: "4096x4096"  // Instead of "2048x2048"
   ```

3. **Enhance prompt:**
   ```typescript
   // Add quality keywords
   const enhancedPrompt = `${originalPrompt}, 
     high quality, professional photography, 
     sharp focus, detailed`
   ```

4. **Adjust expectations:**
   - SeeDream has different style than Gemini
   - Some differences are normal
   - Test multiple prompts to find best results

### Issue 9: Watermark visible when disabled

**Symptoms:**
- Watermark appears despite `watermark: false`
- "AI generated" text visible in corner

**Solutions:**

1. **Verify setting:**
   ```typescript
   console.log("Watermark setting:", requestBody.watermark)
   // Should be: false
   ```

2. **Check API response:**
   ```typescript
   // Log full request body
   console.log("Request:", JSON.stringify(requestBody, null, 2))
   ```

3. **Contact support:**
   - If watermark persists with `watermark: false`
   - May be account-level restriction
   - Check with BytePlus support

---

## Performance Problems

### Issue 10: Generation too slow

**Symptoms:**
- Generation takes >60 seconds
- Timeouts occurring
- Poor user experience

**Causes:**
- Using "standard" mode (45-60s)
- High resolution (4K takes longer)
- Network latency
- Multiple input images

**Solutions:**

1. **Use fast mode:**
   ```typescript
   optimize_prompt_options: {
     mode: "fast"  // 15-30s instead of 45-60s
   }
   ```

2. **Lower resolution:**
   ```typescript
   size: "2K"  // Instead of "4K"
   // or
   size: "2048x2560"  // Instead of "4096x5120"
   ```

3. **Reduce input images:**
   ```typescript
   // Use fewer input images if possible
   images: [mainImage]  // Instead of 5+ images
   ```

4. **Implement loading UI:**
   ```typescript
   // Show progress indicator
   <div>Generating image... (may take 30-60 seconds)</div>
   ```

5. **Add timeout:**
   ```typescript
   const response = await fetch(BYTEPLUS_ENDPOINT, {
     ...
     signal: AbortSignal.timeout(90000)  // 90s timeout
   })
   ```

### Issue 11: High latency

**Symptoms:**
- Request takes long to start
- Slow response times
- Network delays

**Solutions:**

1. **Check network:**
   ```bash
   # Test connectivity
   curl -I https://ark.ap-southeast.bytepluses.com
   ```

2. **Use correct region:**
   ```typescript
   // Use closest region
   // Asia-Pacific: ark.ap-southeast.bytepluses.com
   // Check BytePlus docs for other regions
   ```

3. **Check DNS:**
   ```bash
   # Test DNS resolution
   nslookup ark.ap-southeast.bytepluses.com
   ```

4. **Monitor network:**
   - Check browser DevTools Network tab
   - Look for slow DNS, connection, or SSL times
   - Check Time to First Byte (TTFB)

---

## Integration Issues

### Issue 12: TypeScript errors after migration

**Symptoms:**
- `npx tsc --noEmit` shows errors
- Build fails with type errors
- IDE shows red squiggles

**Solutions:**

1. **Check import paths:**
   ```typescript
   // Ensure correct import
   import { generateImageWithByteplus } from "@/lib/byteplus-client"
   ```

2. **Verify interfaces:**
   ```typescript
   // Make sure interfaces are exported
   export interface BytePlusGenerateParams { ... }
   export interface GenerateResult { ... }
   ```

3. **Check response types:**
   ```typescript
   // Ensure response matches expected type
   const result: GenerateResult = await generateImageWithByteplus(params)
   ```

4. **Fix type mismatches:**
   ```typescript
   // If frontend expects different structure
   return NextResponse.json({
     imageUrl: result.imageUrl,
     text: "",  // Add for compatibility
     usage: result.usage
   })
   ```

### Issue 13: Response format mismatch

**Symptoms:**
- Frontend shows errors
- Image doesn't display
- Console errors about missing fields

**Cause:**
- Frontend expects Gemini response structure
- BytePlus returns different format

**Solution:**

Adapt response to match frontend expectations:

```typescript
// Frontend expects (Gemini format):
{
  imageUrl: string,
  text: string,
  usage: object
}

// BytePlus returns:
{
  imageUrl: string,
  usage: object
  // No text field
}

// Solution: Add empty text field
return NextResponse.json({
  imageUrl: result.imageUrl,
  text: "",  // Empty string for compatibility
  usage: result.usage
})
```

### Issue 14: Build succeeds but runtime errors

**Symptoms:**
- `npm run build` succeeds
- Runtime errors when generating images
- Production deployment fails

**Cause:**
- `ignoreBuildErrors: true` in Next.js config
- Type errors not caught during build

**Solution:**

1. **Run type check explicitly:**
   ```bash
   npx tsc --noEmit
   # Must pass before deployment
   ```

2. **Disable ignoreBuildErrors:**
   ```javascript
   // next.config.js
   module.exports = {
     typescript: {
       ignoreBuildErrors: false  // Catch type errors
     }
   }
   ```

3. **Test locally first:**
   ```bash
   npm run build
   npm start  # Test production build
   ```

---

## Debugging Tips

### Enable Verbose Logging

Add detailed logs throughout the client:

```typescript
export async function generateImageWithByteplus(params) {
  console.log("=== BytePlus Generation Start ===")
  console.log("Prompt:", params.prompt.substring(0, 100))
  console.log("Images:", params.images.length)
  console.log("API Key present:", !!process.env.BYTEPLUS_API_KEY)
  
  // ... rest of function
  
  console.log("Request body:", JSON.stringify(requestBody, null, 2))
  console.log("Response status:", response.status)
  console.log("Response headers:", Object.fromEntries(response.headers))
  
  const result = await response.json()
  console.log("Response body:", JSON.stringify(result, null, 2))
  
  console.log("=== BytePlus Generation End ===")
}
```

### Test API Directly

Use curl to test BytePlus API directly:

```bash
curl -X POST \
  "https://ark.ap-southeast.bytepluses.com/api/v3/images/generations" \
  -H "Authorization: Bearer $BYTEPLUS_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "seedream-4-5-251128",
    "prompt": "A simple test image",
    "image": [],
    "size": "2048x2048",
    "sequential_image_generation": "disabled",
    "watermark": false,
    "response_format": "b64_json",
    "optimize_prompt_options": {
      "mode": "standard"
    }
  }'
```

### Check Network Traffic

Use browser DevTools to inspect requests:

1. Open DevTools (F12)
2. Go to Network tab
3. Filter: "XHR" or "Fetch"
4. Generate image
5. Click on BytePlus request
6. Check:
   - Request headers (Authorization present?)
   - Request payload (correct format?)
   - Response status
   - Response body

### Validate Base64 Images

Check if base64 is valid:

```typescript
function validateBase64Image(base64: string, mimeType: string): boolean {
  try {
    // Decode base64
    const decoded = atob(base64)
    
    // Check length
    if (decoded.length === 0) {
      console.error("Empty image data")
      return false
    }
    
    // Check size
    const sizeMB = decoded.length / (1024 * 1024)
    console.log("Image size:", sizeMB.toFixed(2), "MB")
    
    if (sizeMB > 10) {
      console.error("Image too large:", sizeMB, "MB")
      return false
    }
    
    // Check MIME type signature
    const signature = decoded.substring(0, 10)
    console.log("Image signature:", signature)
    
    return true
  } catch (error) {
    console.error("Invalid base64:", error)
    return false
  }
}
```

### Compare with Working Example

Test with known-good inputs:

```typescript
// Minimal test case
const testResult = await generateImageWithByteplus({
  prompt: "A red circle",
  images: [],
  size: "2048x2048",
  optimizationMode: "fast"
})

console.log("Test result:", testResult)
```

If this works, problem is likely in your inputs.

---

## Getting Help

If issues persist:

1. **Check BytePlus documentation:**
   - API Reference: https://docs.byteplus.com/en/docs/ModelArk/1666945
   - Error Codes: https://docs.byteplus.com/en/docs/82379/1299023

2. **Contact BytePlus support:**
   - Console: https://console.byteplus.com
   - Support tickets for account issues
   - Technical support for API questions

3. **Review this project's migration:**
   - Check `docs/plans/2025-12-18-gemini-to-byteplus-migration-design.md`
   - Review implementation in `lib/byteplus-client.ts`
   - Compare with your implementation

4. **Common fixes checklist:**
   - [ ] API key correct and active
   - [ ] Using correct model ID: `seedream-4-5-251128`
   - [ ] Images in data URI format
   - [ ] Images under 10MB
   - [ ] Supported image formats
   - [ ] TypeScript compilation passes
   - [ ] Environment variables loaded
   - [ ] Dev server restarted after env changes
   - [ ] Correct endpoint region
   - [ ] Network connectivity working

---

## Quick Fixes Summary

| Issue | Quick Fix |
|-------|-----------|
| 401 Auth Error | Check `BYTEPLUS_API_KEY` in `.env.local` |
| 400 Invalid Image | Verify data URI format: `data:image/png;base64,...` |
| Wrong Model ID | Use `seedream-4-5-251128` not `seedream-4.5` |
| No Image Generated | Check content filter, simplify prompt |
| 429 Rate Limit | Implement exponential backoff retry |
| Slow Generation | Use `mode: "fast"` optimization |
| Type Errors | Run `npx tsc --noEmit` |
| Response Mismatch | Add `text: ""` for frontend compatibility |
| Quality Issues | Use `mode: "standard"`, higher resolution |
| Network Errors | Check connectivity, correct endpoint region |
