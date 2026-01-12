import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64 } = await req.json();
    
    if (!imageBase64) {
      return new Response(
        JSON.stringify({ error: 'Image data is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: "AI service is not configured" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log("Processing image for OCR extraction...");

    const systemPrompt = `You are a data extraction assistant for a petrol station sales tracking system. 
Analyze the provided image and extract any sales data you can find. 
Return the data in a structured JSON format with the following possible fields:

{
  "pumpReadings": {
    "petrol1": { "opening_reading": number, "closing_reading": number },
    "petrol2": { "opening_reading": number, "closing_reading": number },
    "petrol3": { "opening_reading": number, "closing_reading": number },
    "petrol4": { "opening_reading": number, "closing_reading": number },
    "diesel1": { "opening_reading": number, "closing_reading": number },
    "diesel2": { "opening_reading": number, "closing_reading": number },
    "diesel3": { "opening_reading": number, "closing_reading": number },
    "diesel4": { "opening_reading": number, "closing_reading": number }
  },
  "paymentMethods": {
    "group1": { "upi": number, "bharat_fleet_card": number, "fiserv": number, "gpay": number, "evening_locker": number },
    "group2": { "upi": number, "bharat_fleet_card": number, "fiserv": number, "phonepay": number, "evening_locker": number }
  },
  "cashDenominations": {
    "group1": { "rs_500": number, "rs_200": number, "rs_100": number, "rs_50": number, "rs_20": number, "rs_10": number, "coins": number },
    "group2": { "rs_500": number, "rs_200": number, "rs_100": number, "rs_50": number, "rs_20": number, "rs_10": number, "coins": number }
  },
  "oilSales": {
    "items": [{ "oil_name": string, "oil_count": number, "oil_price": number }],
    "yesterday_reading": number,
    "today_reading": number,
    "distilled_water_count": number,
    "waste": number
  },
  "expenses": [{ "name": string, "amount": number }],
  "debtors": [{ "name": string, "amount": number }],
  "repaidDebtors": [{ "name": string, "amount": number }]
}

Only include fields that you can clearly identify from the image. Set values to 0 or empty arrays if not found.
If you cannot extract any data, return an empty object {}.
IMPORTANT: Return ONLY the JSON object, no markdown formatting or explanation.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: systemPrompt },
          { 
            role: "user", 
            content: [
              {
                type: "text",
                text: "Please analyze this image and extract all sales data you can find. Return the data as JSON."
              },
              {
                type: "image_url",
                image_url: {
                  url: imageBase64.startsWith('data:') ? imageBase64 : `data:image/jpeg;base64,${imageBase64}`
                }
              }
            ]
          }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded, please try again later." }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required, please add funds to your workspace." }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "AI processing failed" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content || "{}";
    
    console.log("AI response content:", content);

    // Try to parse the response as JSON
    let extractedData = {};
    try {
      // Remove markdown code blocks if present
      let cleanContent = content.trim();
      if (cleanContent.startsWith('```json')) {
        cleanContent = cleanContent.slice(7);
      } else if (cleanContent.startsWith('```')) {
        cleanContent = cleanContent.slice(3);
      }
      if (cleanContent.endsWith('```')) {
        cleanContent = cleanContent.slice(0, -3);
      }
      extractedData = JSON.parse(cleanContent.trim());
    } catch (parseError) {
      console.error("Failed to parse AI response as JSON:", parseError);
      // Return the raw content for debugging
      return new Response(
        JSON.stringify({ 
          error: "Failed to parse extracted data",
          rawContent: content 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        data: extractedData 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("OCR processing error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
