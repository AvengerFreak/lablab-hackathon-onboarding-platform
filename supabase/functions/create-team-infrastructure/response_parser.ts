/**
 * Sanitizes and parses raw character responses from the AI intelligence layer
 * @param rawAiResponse The unformatted raw text string returned by the model completion
 * @returns A validated array of lowercase technical skill strings
 */
export function parseModelSkillsList(rawAiResponse: string): string[] {
  const fallbackDefault = ["general-builder"];

  if (!rawAiResponse || rawAiResponse.trim() === "") {
    return fallbackDefault;
  }

  try {
    // Locate the first square bracket open character and final close character block
    const jsonStartIndex = rawAiResponse.indexOf("[");
    const jsonEndIndex = rawAiResponse.lastIndexOf("]") + 1;

    if (jsonStartIndex === -1 || jsonEndIndex === 0) {
      // If the model output text format is completely broken, fall back safely
      return fallbackDefault;
    }

    // Isolate only the true JSON substring block
    const isolatedJsonText = rawAiResponse.substring(jsonStartIndex, jsonEndIndex);
    
    // Parse raw text characters back into a real JavaScript string array array
    const verifiedArray = JSON.parse(isolatedJsonText);

    if (Array.isArray(verifiedArray)) {
      // Clean up individual string content elements
      return verifiedArray.map(token => String(token).trim().toLowerCase());
    }

    return fallbackDefault;
  } catch (error) {
    console.warn("[Sanitizer Warning] AI extraction stream failed to transform cleanly. Fallback triggered:", error.message);
    return fallbackDefault;
  }
}