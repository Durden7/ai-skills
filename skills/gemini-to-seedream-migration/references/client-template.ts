/**
 * BytePlus SeeDream v4.5 Client Template
 * 
 * Production-ready REST API client for BytePlus image generation service.
 * Copy this template and customize for your project.
 * 
 * This template includes:
 * - Type-safe interfaces
 * - Comprehensive error handling
 * - Verbose logging for debugging
 * - Backward-compatible response format
 */

// =============================================================================
// CONFIGURATION
// =============================================================================

const BYTEPLUS_ENDPOINT = "https://ark.ap-southeast.bytepluses.com/api/v3/images/generations"

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

/**
 * Input image with base64 data and MIME type
 * 
 * IMPORTANT: Pass base64 string WITHOUT the data URI prefix
 * Example: "iVBORw0KGg..." not "data:image/png;base64,iVBORw0KGg..."
 */
interface BytePlusImageInput {
  data: string        // Base64 string (without data URI prefix)
  mimeType: string   // e.g., "image/png", "image/jpeg", "image/webp"
}

/**
 * Parameters for image generation request
 */
interface BytePlusGenerateParams {
  prompt: string                    // Text prompt for generation
  images: BytePlusImageInput[]     // Array of input images (0-14 images)
  
  // Optional: Customize generation parameters
  size?: string                     // e.g., "2048x2560", "2K", "4K"
  watermark?: boolean              // Add watermark (default: false)
  optimizationMode?: "standard" | "fast"  // Quality vs speed (default: "standard")
}

/**
 * BytePlus API response structure
 */
interface BytePlusResponse {
  model: string                    // Model ID used
  created: number                  // Unix timestamp
  data: Array<{
    b64_json: string              // Base64 image data (without data URI prefix)
    size: string                  // Dimensions, e.g., "2048x2560"
  }>
  usage: {
    generated_images: number      // Number of images generated
    output_tokens: number         // Tokens used
    total_tokens: number          // Total tokens
  }
}

/**
 * BytePlus API error structure
 */
interface BytePlusError {
  error: {
    code: string                   // Error code
    message: string                // Error message
  }
}

/**
 * Function return type
 * Returns either successful result or error
 */
interface GenerateResult {
  imageUrl?: string                // Data URI format: "data:image/jpeg;base64,..."
  error?: string                   // Error message if generation failed
  usage?: {
    generated_images: number
    output_tokens: number
    total_tokens: number
  }
}

// =============================================================================
// MAIN FUNCTION
// =============================================================================

/**
 * Generate image using BytePlus SeeDream v4.5
 * 
 * @param params - Generation parameters (prompt, images, options)
 * @returns Generated image as data URI or error message
 * 
 * @example
 * ```typescript
 * const result = await generateImageWithByteplus({
 *   prompt: "A professional product photo",
 *   images: [
 *     { data: base64String, mimeType: "image/png" }
 *   ]
 * })
 * 
 * if (result.error) {
 *   console.error("Generation failed:", result.error)
 * } else {
 *   console.log("Success:", result.imageUrl)
 * }
 * ```
 */
export async function generateImageWithByteplus(
  params: BytePlusGenerateParams
): Promise<GenerateResult> {
  try {
    // =========================================================================
    // STEP 1: VALIDATION
    // =========================================================================
    
    console.log("[BytePlus] Starting image generation")
    console.log("[BytePlus] Prompt length:", params.prompt.length)
    console.log("[BytePlus] Number of input images:", params.images.length)

    // Validate API key exists
    if (!process.env.BYTEPLUS_API_KEY) {
      console.error("[BytePlus] API key not configured")
      return { error: "BytePlus API key not configured" }
    }

    // Validate prompt
    if (!params.prompt || params.prompt.trim().length === 0) {
      console.error("[BytePlus] Empty prompt provided")
      return { error: "Prompt is required" }
    }

    // Validate images array (optional, but log if empty)
    if (params.images.length === 0) {
      console.warn("[BytePlus] No input images provided (text-to-image generation)")
    }

    // =========================================================================
    // STEP 2: FORMAT CONVERSION
    // =========================================================================
    
    // Convert base64 strings to data URI format
    // BytePlus requires: "data:image/png;base64,iVBORw0KGg..."
    // Input is plain base64: "iVBORw0KGg..."
    const imageDataUris = params.images.map(img => 
      `data:${img.mimeType};base64,${img.data}`
    )

    console.log("[BytePlus] Converted images to data URI format")

    // =========================================================================
    // STEP 3: BUILD REQUEST BODY
    // =========================================================================
    
    const requestBody = {
      // Required parameters
      model: "seedream-4-5-251128",  // Latest SeeDream v4.5 model
      prompt: params.prompt,
      image: imageDataUris,           // Array of data URIs
      
      // Generation options
      size: params.size || "2048x2560",  // Default: portrait for product images
      sequential_image_generation: "disabled",  // Single image output
      watermark: params.watermark !== undefined ? params.watermark : false,
      response_format: "b64_json",    // Return base64 (not URL)
      
      // Prompt optimization
      optimize_prompt_options: {
        mode: params.optimizationMode || "standard"  // "standard" or "fast"
      }
    }

    console.log("[BytePlus] Request configuration:")
    console.log("[BytePlus]   - Model:", requestBody.model)
    console.log("[BytePlus]   - Size:", requestBody.size)
    console.log("[BytePlus]   - Optimization:", requestBody.optimize_prompt_options.mode)
    console.log("[BytePlus]   - Watermark:", requestBody.watermark)

    // =========================================================================
    // STEP 4: MAKE API REQUEST
    // =========================================================================
    
    console.log("[BytePlus] Sending request to BytePlus API...")

    const response = await fetch(BYTEPLUS_ENDPOINT, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.BYTEPLUS_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody)
    })

    console.log("[BytePlus] Response status:", response.status)

    // =========================================================================
    // STEP 5: ERROR HANDLING
    // =========================================================================
    
    if (!response.ok) {
      const errorData: BytePlusError = await response.json()
      console.error("[BytePlus] API error:", errorData)

      // Map HTTP status codes to user-friendly messages
      switch (response.status) {
        case 400:
          // Bad Request - Invalid parameters
          console.error("[BytePlus] 400: Invalid request parameters")
          return { 
            error: "Invalid image or prompt", 
          }
        
        case 401:
          // Unauthorized - Invalid API key
          console.error("[BytePlus] 401: Authentication failed")
          return { error: "BytePlus API authentication failed" }
        
        case 429:
          // Too Many Requests - Rate limit
          console.error("[BytePlus] 429: Rate limit exceeded")
          return { error: "Rate limit exceeded, please try again later" }
        
        case 500:
          // Internal Server Error - Service issue
          console.error("[BytePlus] 500: Service error")
          return { error: "BytePlus service error, please retry" }
        
        default:
          // Unknown error
          console.error("[BytePlus] Unknown error status:", response.status)
          return { 
            error: errorData.error?.message || "Failed to generate image" 
          }
      }
    }

    // =========================================================================
    // STEP 6: PARSE SUCCESSFUL RESPONSE
    // =========================================================================
    
    const result: BytePlusResponse = await response.json()

    console.log("[BytePlus] Response received")
    console.log("[BytePlus] Generated images:", result.data?.length || 0)

    // =========================================================================
    // STEP 7: VALIDATE RESPONSE DATA
    // =========================================================================
    
    // Check if data array exists and is not empty
    if (!result.data || result.data.length === 0) {
      console.error("[BytePlus] No image data in response")
      return { error: "No image was generated" }
    }

    // Check if first image has base64 data
    if (!result.data[0].b64_json) {
      console.error("[BytePlus] Missing b64_json in response")
      return { error: "No image data in response" }
    }

    // =========================================================================
    // STEP 8: FORMAT RESPONSE
    // =========================================================================
    
    // Convert to data URI format for frontend
    // BytePlus returns plain base64: "iVBORw0KGg..."
    // We need data URI: "data:image/jpeg;base64,iVBORw0KGg..."
    const base64Image = `data:image/jpeg;base64,${result.data[0].b64_json}`
    
    console.log("[BytePlus] Image generated successfully")
    console.log("[BytePlus] Image size:", result.data[0].size)
    console.log("[BytePlus] Usage:", result.usage)

    return {
      imageUrl: base64Image,
      usage: result.usage
    }

  } catch (error) {
    // =========================================================================
    // STEP 9: CATCH UNEXPECTED ERRORS
    // =========================================================================
    
    console.error("[BytePlus] Generation error:", error)
    console.error("[BytePlus] Error type:", typeof error)
    console.error("[BytePlus] Error message:", error instanceof Error ? error.message : String(error))
    
    return { 
      error: error instanceof Error ? error.message : "Failed to generate image" 
    }
  }
}

// =============================================================================
// USAGE EXAMPLES
// =============================================================================

/**
 * Example 1: Text-to-Image (no input images)
 */
export async function exampleTextToImage() {
  const result = await generateImageWithByteplus({
    prompt: "A professional product photo of a red t-shirt on a white background",
    images: []
  })

  if (result.error) {
    console.error("Failed:", result.error)
  } else {
    console.log("Generated:", result.imageUrl)
  }
}

/**
 * Example 2: Image-to-Image (single input image)
 */
export async function exampleImageToImage(inputImageBase64: string) {
  const result = await generateImageWithByteplus({
    prompt: "Transform this into a watercolor painting style",
    images: [
      { data: inputImageBase64, mimeType: "image/png" }
    ]
  })

  if (result.error) {
    console.error("Failed:", result.error)
  } else {
    console.log("Generated:", result.imageUrl)
  }
}

/**
 * Example 3: Multi-Image Blending (2+ input images)
 */
export async function exampleMultiImageBlending(
  userPhotoBase64: string,
  productImageBase64: string
) {
  const result = await generateImageWithByteplus({
    prompt: "Show the person wearing this product in a professional photoshoot style",
    images: [
      { data: userPhotoBase64, mimeType: "image/jpeg" },
      { data: productImageBase64, mimeType: "image/png" }
    ]
  })

  if (result.error) {
    console.error("Failed:", result.error)
  } else {
    console.log("Generated:", result.imageUrl)
    console.log("Usage:", result.usage)
  }
}

/**
 * Example 4: Custom Parameters
 */
export async function exampleCustomParameters(imageBase64: string) {
  const result = await generateImageWithByteplus({
    prompt: "High-resolution product photo",
    images: [{ data: imageBase64, mimeType: "image/png" }],
    size: "4K",                      // Use semantic resolution
    watermark: true,                 // Add watermark
    optimizationMode: "fast"         // Faster generation
  })

  if (result.error) {
    console.error("Failed:", result.error)
  } else {
    console.log("Generated:", result.imageUrl)
  }
}

// =============================================================================
// NOTES FOR CUSTOMIZATION
// =============================================================================

/*
 * CUSTOMIZATION CHECKLIST:
 * 
 * 1. Update BYTEPLUS_ENDPOINT if using different region
 * 2. Change default size in requestBody (line 144)
 * 3. Adjust optimization mode default (line 150)
 * 4. Modify error messages for your app's UX
 * 5. Add retry logic for 5xx errors if needed
 * 6. Customize logging prefix "[BytePlus]" for your project
 * 7. Add request timeout if needed
 * 8. Implement usage tracking if required
 * 
 * COMMON MODIFICATIONS:
 * 
 * - Different default size:
 *   size: params.size || "2048x2048"  // Square instead of portrait
 * 
 * - Enable watermark by default:
 *   watermark: params.watermark !== undefined ? params.watermark : true
 * 
 * - Fast mode by default:
 *   mode: params.optimizationMode || "fast"
 * 
 * - Add retry for 500 errors:
 *   if (response.status === 500 && retryCount < 3) {
 *     await sleep(1000)
 *     return generateImageWithByteplus(params, retryCount + 1)
 *   }
 * 
 * - Add timeout:
 *   const response = await fetch(BYTEPLUS_ENDPOINT, {
 *     ...
 *     signal: AbortSignal.timeout(60000)  // 60s timeout
 *   })
 */
