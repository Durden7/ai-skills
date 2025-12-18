# Testing Checklist: BytePlus Migration

Comprehensive testing guide for validating Gemini to BytePlus SeeDream v4.5 migration.

---

## Pre-Migration Testing

### 1. Environment Setup

- [ ] **Obtain BytePlus API key**
  - Visit https://console.byteplus.com/ark/region:ark+ap-southeast-1/apiKey
  - Create new API key
  - Copy key securely

- [ ] **Add key to local environment**
  ```bash
  # Add to .env.local
  BYTEPLUS_API_KEY=your_actual_byteplus_api_key
  ```

- [ ] **Verify key is detected**
  ```bash
  npm run validate
  # or
  node scripts/validate-env.js
  ```
  
  Expected output:
  ```
  ✅ BYTEPLUS_API_KEY - Configured
  ```

### 2. Backup Current Implementation

- [ ] **Create feature branch**
  ```bash
  git checkout -b feat/migrate-to-byteplus
  ```

- [ ] **Verify git status is clean**
  ```bash
  git status
  # Should show: "nothing to commit, working tree clean"
  ```

- [ ] **Document current Gemini behavior**
  - Test current image generation
  - Screenshot successful outputs
  - Note generation times
  - Record image quality

---

## During Migration Testing

### 3. TypeScript Compilation

After each code change:

- [ ] **Run type checker**
  ```bash
  npx tsc --noEmit
  ```
  
  Expected: No type errors
  
- [ ] **Check for common issues**
  - Missing imports
  - Incorrect type definitions
  - Missing properties in interfaces
  - Wrong function signatures

### 4. Linting

- [ ] **Run linter**
  ```bash
  npm run lint
  ```
  
  Expected: No warnings or errors
  
- [ ] **Fix any linting issues**
  ```bash
  npm run lint:fix  # If available
  ```

### 5. Build Verification

- [ ] **Test build succeeds**
  ```bash
  npm run build
  ```
  
  Expected: Build completes successfully
  
  **Note:** If using `ignoreBuildErrors: true` in Next.js config, manually check console output for actual errors

- [ ] **Verify bundle size**
  - Check if bundle decreased (removed Gemini SDK)
  - New bundle should be smaller or similar size

---

## Post-Migration Testing

### 6. Environment Validation

- [ ] **Run environment validator**
  ```bash
  npm run validate
  ```
  
  Expected output:
  ```
  ✅ BYTEPLUS_API_KEY - Configured
  ✅ NEXT_PUBLIC_SUPABASE_URL - Configured
  ✅ NEXT_PUBLIC_SUPABASE_ANON_KEY - Configured
  ✅ SUPABASE_SERVICE_ROLE_KEY - Configured
  ```

- [ ] **Verify Gemini key is NOT required**
  ```bash
  grep GEMINI .env.example
  # Should return nothing or only in comments
  ```

### 7. Manual API Testing

Start development server:
```bash
npm run dev
```

#### Test Scenario 1: Happy Path (Success)

- [ ] **Prepare test data**
  - Select 2 valid test images (PNG or JPEG)
  - Images < 10MB each
  - Images with valid dimensions

- [ ] **Test image generation**
  - Navigate to image generation page
  - Upload test images
  - Enter test prompt: "A professional product photo"
  - Click generate
  
- [ ] **Verify success**
  - Image generates without errors
  - Response time acceptable (15-60s depending on mode)
  - Generated image displays correctly
  - No console errors
  - Image dimensions correct (e.g., 2048x2560)

- [ ] **Check image quality**
  - Image resolution matches expected (2048x2560 or configured size)
  - No visible watermark (if disabled)
  - Image quality acceptable
  - Colors accurate
  - No artifacts or corruption

- [ ] **Verify usage metadata**
  - Usage information returned
  - Token count reasonable
  - Image count correct

#### Test Scenario 2: Invalid API Key

- [ ] **Set invalid key**
  ```bash
  # In .env.local
  BYTEPLUS_API_KEY=invalid_key_test
  ```

- [ ] **Restart dev server**
  ```bash
  # Stop and restart npm run dev
  ```

- [ ] **Test generation**
  - Attempt to generate image
  
- [ ] **Verify error handling**
  - Returns 401 error
  - Error message clear: "BytePlus API authentication failed"
  - No application crash
  - Error logged to console with [BytePlus] prefix

- [ ] **Restore valid key**
  ```bash
  # Restore actual key in .env.local
  ```

#### Test Scenario 3: Missing Images

- [ ] **Test with no images**
  - Navigate to generation page
  - Don't upload images (or upload only 1 if 2 required)
  - Click generate
  
- [ ] **Verify error handling**
  - Returns 400 error
  - Error message clear
  - Application handles gracefully
  - No crash

#### Test Scenario 4: Invalid Image Format

- [ ] **Test with unsupported format**
  - Create or use SVG file
  - Try to upload
  
- [ ] **Verify handling**
  - Frontend rejects upload, OR
  - Backend converts to supported format, OR
  - Returns clear error message

#### Test Scenario 5: Large Images

- [ ] **Test with large image**
  - Use image > 10MB
  - Try to generate
  
- [ ] **Verify handling**
  - Clear error message about size limit
  - No timeout
  - No crash

#### Test Scenario 6: Rate Limiting (Optional)

- [ ] **Test multiple rapid requests**
  - Generate multiple images quickly
  - Continue until rate limited
  
- [ ] **Verify rate limit handling**
  - Returns 429 error
  - Error message includes retry time
  - Application handles gracefully

### 8. Database-Driven Prompts (If Applicable)

If using database-driven prompts (like `/api/generate-model-image`):

- [ ] **Test prompt fetching**
  - Generate image for product with custom prompt
  - Verify correct prompt used
  - Check database query logs

- [ ] **Test prompt fallback**
  - Try product with no custom prompt
  - Verify category default used
  - Test ultimate fallback prompt

- [ ] **Test color injection**
  - Generate with product that has color
  - Verify color mentioned in prompt
  - Check generated image reflects color

### 9. Response Format Compatibility

- [ ] **Verify response matches frontend expectations**
  ```typescript
  {
    imageUrl: string,      // Data URI format
    text: string,          // Empty string for BytePlus
    usage: object          // Usage metadata
  }
  ```

- [ ] **Test with existing frontend**
  - Frontend displays image correctly
  - No console errors about missing fields
  - Usage metadata displays (if shown)

### 10. Logging Verification

- [ ] **Check server logs**
  - Open terminal running dev server
  - Generate test image
  - Verify logs present:
    ```
    [BytePlus] Starting image generation
    [BytePlus] Prompt length: X
    [BytePlus] Number of input images: Y
    [BytePlus] Sending request to BytePlus API...
    [BytePlus] Response status: 200
    [BytePlus] Response received
    [BytePlus] Generated images: 1
    [BytePlus] Image generated successfully
    [BytePlus] Image size: 2048x2560
    [BytePlus] Usage: { ... }
    ```

- [ ] **Check browser console**
  - Open browser DevTools
  - Generate test image
  - Verify no unexpected errors
  - Check network tab shows successful API call

---

## Production Deployment Testing

### 11. Staging/Preview Environment

- [ ] **Deploy to staging**
  ```bash
  # Deploy to preview/staging environment
  git push origin feat/migrate-to-byteplus
  ```

- [ ] **Set production API key**
  - Add `BYTEPLUS_API_KEY` to staging environment
  - Remove `GEMINI_API_KEY` from staging

- [ ] **Verify staging environment**
  - Environment variables set correctly
  - Application starts without errors
  - Health check passes

- [ ] **Test in staging**
  - Run all manual tests again
  - Test with production-like data
  - Verify performance acceptable
  - Check error handling

### 12. Performance Testing

- [ ] **Test generation time**
  - Standard mode: 45-60s expected
  - Fast mode: 15-30s expected
  - Compare with Gemini baseline

- [ ] **Test concurrent requests**
  - Generate multiple images simultaneously
  - Verify all succeed
  - Check for rate limits

- [ ] **Test with different sizes**
  - Test 2048x2560 (portrait)
  - Test 2560x2048 (landscape)
  - Test 2048x2048 (square)
  - Test 4K if needed

### 13. Image Quality Comparison

- [ ] **Generate same prompts as Gemini**
  - Use identical prompts
  - Use identical input images
  - Generate with BytePlus

- [ ] **Compare outputs**
  - Resolution (BytePlus should be higher)
  - Color accuracy
  - Detail preservation
  - Overall quality

- [ ] **Document findings**
  - Take screenshots
  - Note any quality differences
  - Adjust optimization mode if needed

### 14. Error Scenario Testing

- [ ] **Network failure simulation**
  - Disconnect internet mid-request
  - Verify graceful handling
  - Check error message

- [ ] **Invalid inputs**
  - Test with corrupted base64
  - Test with empty prompt
  - Test with extremely long prompt (>10k chars)

- [ ] **Service unavailability**
  - If possible, test 500/503 handling
  - Verify retry logic (if implemented)

### 15. Cost Monitoring

- [ ] **Set up usage tracking**
  - Log all generation requests
  - Track tokens used
  - Calculate costs

- [ ] **Compare costs with Gemini**
  - Calculate cost per image
  - Project monthly costs
  - Verify cost savings (if expected)

- [ ] **Set up alerts**
  - Alert on high usage
  - Alert on repeated errors
  - Alert on quota approaching

---

## Documentation Verification

### 16. Check Documentation Updates

- [ ] **README.md updated**
  - Mentions BytePlus instead of Gemini
  - Setup instructions correct
  - Links valid

- [ ] **SETUP.md updated**
  - API key setup instructions for BytePlus
  - Correct console URL
  - Environment variable name correct

- [ ] **API documentation updated**
  - Endpoint descriptions accurate
  - Error codes documented
  - Response format documented

- [ ] **Architecture docs updated**
  - System diagrams reflect BytePlus
  - Data flow correct
  - Tech stack list updated

### 17. Search for Stale References

- [ ] **Search codebase**
  ```bash
  grep -ri "gemini\|google ai" *.md docs/*.md
  ```
  
  Expected: Only in migration plans/changelogs, no active references

- [ ] **Search code**
  ```bash
  grep -r "GoogleGenAI\|@google/genai" app/ lib/ components/
  ```
  
  Expected: No matches

---

## Final Checklist

### 18. Pre-Production Deployment

- [ ] All tests passing
- [ ] TypeScript compilation clean
- [ ] Linting clean
- [ ] Build succeeds
- [ ] No Gemini references in active code
- [ ] Documentation updated
- [ ] Staging tests passed
- [ ] Performance acceptable
- [ ] Error handling verified
- [ ] Logging working
- [ ] Monitoring set up

### 19. Production Deployment

- [ ] **Set production environment variables**
  - Add `BYTEPLUS_API_KEY` to production
  - Remove `GEMINI_API_KEY` from production

- [ ] **Deploy to production**
  ```bash
  git checkout main
  git merge feat/migrate-to-byteplus
  git push origin main
  ```

- [ ] **Verify deployment**
  - Application starts successfully
  - No errors in logs
  - Health check passes

- [ ] **Test in production**
  - Generate test image
  - Verify success
  - Check performance
  - Monitor for 1 hour

### 20. Post-Deployment Monitoring

- [ ] **Monitor for 24 hours**
  - Check error rates
  - Check generation success rate
  - Monitor response times
  - Track costs

- [ ] **Verify no regressions**
  - User-reported issues
  - Error logs
  - Performance metrics

- [ ] **Compare metrics**
  - Success rate vs Gemini baseline
  - Average generation time
  - Error rate
  - User satisfaction

---

## Rollback Plan

If issues discovered after deployment:

### 21. Rollback Procedure

- [ ] **Revert code**
  ```bash
  git revert HEAD~N..HEAD  # Revert last N commits
  # OR
  git checkout <previous-commit-hash>
  git push origin main --force  # Use with caution
  ```

- [ ] **Restore environment variables**
  - Re-add `GEMINI_API_KEY` to production
  - Can keep `BYTEPLUS_API_KEY` for future retry

- [ ] **Restore dependencies**
  ```bash
  npm install @google/genai
  npm install
  ```

- [ ] **Deploy rollback**
  ```bash
  npm run build
  # Deploy to production
  ```

- [ ] **Verify rollback**
  - Application working with Gemini
  - No errors
  - Users can generate images

- [ ] **Document rollback reason**
  - What went wrong
  - Why rollback was necessary
  - Plan for retry

---

## Success Criteria

Migration is successful when ALL of the following are true:

- ✅ Environment validation passes with `BYTEPLUS_API_KEY`
- ✅ TypeScript compilation passes with no errors
- ✅ Linting passes with no warnings
- ✅ Build succeeds
- ✅ All manual test scenarios pass
- ✅ Image quality meets or exceeds Gemini
- ✅ Generation time acceptable
- ✅ Error handling works correctly
- ✅ No console errors
- ✅ Logging captures all events
- ✅ Documentation updated
- ✅ No Gemini references in active code
- ✅ Staging environment stable
- ✅ Production deployment successful
- ✅ No user-reported issues for 24 hours
- ✅ Metrics match or exceed baseline

---

## Testing Tools

### Recommended Tools

1. **Postman/Insomnia** - For API endpoint testing
2. **Chrome DevTools** - For network inspection
3. **Lighthouse** - For performance testing
4. **k6/Artillery** - For load testing
5. **Sentry/DataDog** - For error monitoring

### Sample Test Scripts

#### Test Script 1: Basic Health Check
```bash
#!/bin/bash
# test-byteplus.sh

echo "Testing BytePlus integration..."

# Check environment
if [ -z "$BYTEPLUS_API_KEY" ]; then
  echo "❌ BYTEPLUS_API_KEY not set"
  exit 1
fi
echo "✅ BYTEPLUS_API_KEY configured"

# Test compilation
npx tsc --noEmit
if [ $? -ne 0 ]; then
  echo "❌ TypeScript errors"
  exit 1
fi
echo "✅ TypeScript clean"

# Test linting
npm run lint
if [ $? -ne 0 ]; then
  echo "❌ Linting errors"
  exit 1
fi
echo "✅ Linting clean"

# Test build
npm run build
if [ $? -ne 0 ]; then
  echo "❌ Build failed"
  exit 1
fi
echo "✅ Build successful"

echo "✅ All checks passed"
```

#### Test Script 2: API Endpoint Test
```javascript
// test-api.js
const axios = require('axios');
const fs = require('fs');

async function testImageGeneration() {
  const testImage = fs.readFileSync('./test-image.png', 'base64');
  
  const response = await axios.post('http://localhost:3000/api/generate-image', {
    prompt: 'A test image',
    image1: testImage,
    image2: testImage
  });
  
  if (response.data.imageUrl) {
    console.log('✅ Image generated successfully');
    console.log('Size:', response.data.imageUrl.length);
    console.log('Usage:', response.data.usage);
  } else {
    console.log('❌ Generation failed:', response.data.error);
  }
}

testImageGeneration();
```

---

## Notes

- Test thoroughly in staging before production
- Keep rollback plan ready
- Monitor closely after deployment
- Document all test results
- Compare metrics with Gemini baseline
- Set up alerts for production issues
