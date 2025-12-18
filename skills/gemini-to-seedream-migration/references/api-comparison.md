# API Comparison: Gemini vs BytePlus SeeDream v4.5

Comprehensive parameter mapping for migrating from Google Gemini 2.5 Flash Image to BytePlus SeeDream v4.5.

---

## Table of Contents

1. [Authentication](#authentication)
2. [Model Selection](#model-selection)
3. [Image Input](#image-input)
4. [Text Prompt](#text-prompt)
5. [Resolution & Size](#resolution--size)
6. [Generation Options](#generation-options)
7. [Response Structure](#response-structure)
8. [Error Handling](#error-handling)

---

## Authentication

### Gemini 2.5 Flash
```typescript
import { GoogleGenAI } from "@google/genai"

const genAI = new GoogleGenAI({ 
  apiKey: process.env.GEMINI_API_KEY 
})
```

**Environment variable:** `GEMINI_API_KEY`
**Method:** SDK constructor parameter

### BytePlus SeeDream v4.5
```typescript
const response = await fetch(BYTEPLUS_ENDPOINT, {
  headers: {
    "Authorization": `Bearer ${process.env.BYTEPLUS_API_KEY}`,
    "Content-Type": "application/json"
  }
})
```

**Environment variable:** `BYTEPLUS_API_KEY`
**Method:** Bearer token in Authorization header

---

## Model Selection

### Gemini 2.5 Flash
```typescript
model: "gemini-2.5-flash-image"
```

**Model family:** Gemini 2.5 Flash
**Purpose:** Fast image generation with multimodal understanding

### BytePlus SeeDream v4.5
```typescript
model: "seedream-4-5-251128"
```

**Model family:** SeeDream 4.5
**Purpose:** High-quality image generation with prompt optimization
**Note:** Use exact version ID `seedream-4-5-251128`, not `seedream-4.5`

---

## Image Input

### Gemini 2.5 Flash
```typescript
{
  role: "user",
  parts: [
    { text: "Generate an image..." },
    {
      inlineData: {
        mimeType: "image/png",
        data: base64String  // Plain base64
      }
    },
    {
      inlineData: {
        mimeType: "image/jpeg",
        data: base64String2
      }
    }
  ]
}
```

**Format:** Plain base64 string
**MIME types:** `image/png`, `image/jpeg`, `image/webp`
**Max images:** Multiple images in parts array

### BytePlus SeeDream v4.5
```typescript
{
  image: [
    "data:image/png;base64,iVBORw0KGg...",  // Data URI format
    "data:image/jpeg;base64,/9j/4AAQSk..."
  ]
}
```

**Format:** Data URI (`data:${mimeType};base64,${base64String}`)
**MIME types:** `image/png`, `image/jpeg`, `image/webp`, `image/bmp`, `image/tiff`, `image/gif`
**Max images:** 14 reference images
**Single image:** Still pass as array with one element

**Conversion example:**
```typescript
// Gemini input
const geminiImage = {
  mimeType: "image/png",
  data: "iVBORw0KGg..."
}

// BytePlus input (convert to data URI)
const byteplusImage = `data:${geminiImage.mimeType};base64,${geminiImage.data}`
```

---

## Text Prompt

### Gemini 2.5 Flash
```typescript
{
  role: "user",
  parts: [
    { text: "Your prompt here" },
    // images...
  ]
}
```

**Location:** In parts array as `{ text: "..." }`
**Max length:** No strict limit documented

### BytePlus SeeDream v4.5
```typescript
{
  prompt: "Your prompt here"
}
```

**Location:** Top-level parameter
**Recommended length:** Under 600 English words
**Note:** Very long prompts may cause model to miss details

---

## Resolution & Size

### Gemini 2.5 Flash
```typescript
config: {
  imageConfig: {
    aspectRatio: "4:5"  // Semantic aspect ratio
  }
}
```

**Method:** Aspect ratio specification
**Options:** 
- `"1:1"` - Square
- `"4:5"` - Portrait (common for product images)
- `"16:9"` - Landscape
- Other standard ratios

**Actual resolution:** Model determines exact pixels

### BytePlus SeeDream v4.5
```typescript
{
  size: "2048x2560"  // Exact pixel dimensions
}
```

**Method:** Exact pixel dimensions OR semantic resolution

**Option 1 - Exact pixels:**
```typescript
size: "2048x2560"  // width x height
```

- Total pixels range: `[3,686,400, 16,777,216]`
- Aspect ratio range: `[1/16, 16]`
- Both constraints must be satisfied

**Common dimensions:**
| Aspect Ratio | Dimensions |
|--------------|------------|
| 1:1 (Square) | `2048x2048` |
| 4:3 | `2304x1728` |
| 3:4 | `1728x2304` |
| 16:9 | `2560x1440` |
| 9:16 | `1440x2560` |
| 3:2 | `2496x1664` |
| 2:3 | `1664x2496` |

**Option 2 - Semantic resolution:**
```typescript
size: "2K"  // or "4K"
```

Model determines exact dimensions based on prompt description.

---

## Generation Options

### Gemini 2.5 Flash
```typescript
config: {
  responseModalities: ["IMAGE"],  // TEXT+IMAGE also supported
  imageConfig: {
    aspectRatio: "4:5"
  }
}
```

**Available options:**
- `responseModalities`: `["IMAGE"]` or `["TEXT", "IMAGE"]`
- `imageConfig.aspectRatio`: Aspect ratio string

### BytePlus SeeDream v4.5
```typescript
{
  model: "seedream-4-5-251128",
  prompt: "...",
  image: [...],
  size: "2048x2560",
  sequential_image_generation: "disabled",
  watermark: false,
  response_format: "b64_json",
  optimize_prompt_options: {
    mode: "standard"
  }
}
```

**Available options:**

| Parameter | Options | Description |
|-----------|---------|-------------|
| `sequential_image_generation` | `"auto"`, `"disabled"` | Batch generation (auto) or single image (disabled) |
| `watermark` | `true`, `false` | Add "AI generated" watermark |
| `response_format` | `"url"`, `"b64_json"` | Return URL or base64 |
| `optimize_prompt_options.mode` | `"standard"`, `"fast"` | Quality vs speed tradeoff |

**Prompt optimization comparison:**
- `"standard"`: Higher quality, 45-60s generation time
- `"fast"`: Good quality, 15-30s generation time

---

## Response Structure

### Gemini 2.5 Flash
```typescript
{
  candidates: [{
    content: {
      parts: [
        {
          text: "Optional text description"
        },
        {
          inlineData: {
            mimeType: "image/jpeg",
            data: "base64String"  // Plain base64
          }
        }
      ]
    }
  }],
  usageMetadata: {
    promptTokenCount: 123,
    candidatesTokenCount: 456,
    totalTokenCount: 579
  }
}
```

**Extracting image:**
```typescript
const imagePart = result.candidates[0].content.parts.find(
  part => part.inlineData && part.inlineData.mimeType?.startsWith("image/")
)

if (imagePart?.inlineData?.data) {
  const base64Image = `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`
}
```

### BytePlus SeeDream v4.5
```typescript
{
  model: "seedream-4-5-251128",
  created: 1734567890,
  data: [{
    b64_json: "base64String",  // Plain base64
    size: "2048x2560"
  }],
  usage: {
    generated_images: 1,
    output_tokens: 8192,
    total_tokens: 8192
  }
}
```

**Extracting image:**
```typescript
if (result.data && result.data.length > 0) {
  const base64Image = `data:image/jpeg;base64,${result.data[0].b64_json}`
  const dimensions = result.data[0].size  // "2048x2560"
}
```

**Key differences:**
- Gemini returns array of candidates (usually 1)
- BytePlus returns array of data (1-15 for batch generation)
- Gemini can return text + image
- BytePlus only returns images
- Both return plain base64 (need to add data URI prefix)

---

## Error Handling

### Gemini 2.5 Flash

**SDK throws exceptions:**
```typescript
try {
  const result = await genAI.models.generateContent(...)
} catch (error) {
  // Exception handling
  console.error("Generation failed:", error)
}
```

**Common error patterns:**
- Invalid API key → SDK initialization fails
- Content policy violation → Empty candidates
- Network errors → Fetch exceptions
- Rate limits → Exception with status code

### BytePlus SeeDream v4.5

**HTTP status codes:**
```typescript
const response = await fetch(...)

if (!response.ok) {
  const error = await response.json()
  
  switch (response.status) {
    case 400:
      // Invalid request parameters
      return { error: "Invalid image or prompt" }
    
    case 401:
      // Authentication failed
      return { error: "BytePlus API authentication failed" }
    
    case 429:
      // Rate limit exceeded
      return { error: "Rate limit exceeded, please try again later" }
    
    case 500:
      // Internal service error
      return { error: "BytePlus service error, please retry" }
    
    default:
      return { error: error.error?.message || "Failed to generate image" }
  }
}
```

**Error response structure:**
```typescript
{
  error: {
    code: "INVALID_ARGUMENT",
    message: "Detailed error message"
  }
}
```

**Common status codes:**
- `400` - Bad Request (invalid parameters, image format, size)
- `401` - Unauthorized (invalid API key)
- `429` - Too Many Requests (rate limit)
- `500` - Internal Server Error (service issue)

---

## Complete Migration Example

### Before (Gemini)
```typescript
import { GoogleGenAI } from "@google/genai"

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! })

async function generateImage(prompt: string, imageBase64: string) {
  try {
    const result = await genAI.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: [{
        role: "user",
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType: "image/png",
              data: imageBase64
            }
          }
        ]
      }],
      config: {
        responseModalities: ["IMAGE"],
        imageConfig: {
          aspectRatio: "4:5"
        }
      }
    })

    const imagePart = result.candidates[0].content.parts.find(
      p => p.inlineData
    )
    
    return {
      imageUrl: `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`,
      usage: result.usageMetadata
    }
  } catch (error) {
    console.error("Generation failed:", error)
    return { error: error.message }
  }
}
```

### After (BytePlus)
```typescript
const BYTEPLUS_ENDPOINT = "https://ark.ap-southeast.bytepluses.com/api/v3/images/generations"

async function generateImage(prompt: string, imageBase64: string) {
  try {
    if (!process.env.BYTEPLUS_API_KEY) {
      return { error: "BytePlus API key not configured" }
    }

    const imageDataUri = `data:image/png;base64,${imageBase64}`

    const response = await fetch(BYTEPLUS_ENDPOINT, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.BYTEPLUS_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "seedream-4-5-251128",
        prompt: prompt,
        image: [imageDataUri],
        size: "2048x2560",
        sequential_image_generation: "disabled",
        watermark: false,
        response_format: "b64_json",
        optimize_prompt_options: {
          mode: "standard"
        }
      })
    })

    if (!response.ok) {
      const error = await response.json()
      
      switch (response.status) {
        case 400:
          return { error: "Invalid image or prompt" }
        case 401:
          return { error: "BytePlus API authentication failed" }
        case 429:
          return { error: "Rate limit exceeded, please try again later" }
        case 500:
          return { error: "BytePlus service error, please retry" }
        default:
          return { error: error.error?.message || "Failed to generate image" }
      }
    }

    const result = await response.json()

    if (!result.data || result.data.length === 0) {
      return { error: "No image was generated" }
    }

    return {
      imageUrl: `data:image/jpeg;base64,${result.data[0].b64_json}`,
      usage: result.usage
    }
  } catch (error) {
    console.error("Generation failed:", error)
    return { error: error instanceof Error ? error.message : "Failed to generate image" }
  }
}
```

---

## Quick Reference Table

| Feature | Gemini 2.5 Flash | BytePlus SeeDream v4.5 |
|---------|------------------|------------------------|
| **Integration** | NPM SDK | REST API (fetch) |
| **Authentication** | Constructor parameter | Bearer token header |
| **Model ID** | `gemini-2.5-flash-image` | `seedream-4-5-251128` |
| **Image Format** | Base64 in `inlineData` | Data URI in `image` array |
| **Prompt** | In `parts` array | Top-level `prompt` |
| **Resolution** | Aspect ratio (`4:5`) | Exact pixels (`2048x2560`) or `2K`/`4K` |
| **Max Images** | Multiple in parts | Up to 14 |
| **Response** | `candidates[].content.parts[]` | `data[0].b64_json` |
| **Text Output** | Supported | Not supported |
| **Watermark** | Invisible SynthID | Optional visible |
| **Prompt Optimization** | Built-in | Configurable (`standard`/`fast`) |
| **Error Handling** | Exceptions | HTTP status codes |

---

## Notes

1. **Data URI format is critical** - BytePlus requires `data:image/png;base64,...` not plain base64
2. **Model ID must be exact** - Use `seedream-4-5-251128` not `seedream-4.5`
3. **No text generation** - If your frontend expects `text` field, return empty string for compatibility
4. **Response parsing** - Gemini uses `candidates[0].content.parts[]`, BytePlus uses `data[0]`
5. **Error codes** - BytePlus uses HTTP status, Gemini throws exceptions
6. **Max resolution** - BytePlus supports up to 4K, Gemini up to 2K
7. **Generation time** - BytePlus fast mode ~15-30s, standard mode ~45-60s, Gemini ~10-20s
