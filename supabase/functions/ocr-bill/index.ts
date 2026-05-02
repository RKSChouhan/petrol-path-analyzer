 import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
 
 const corsHeaders = {
   'Access-Control-Allow-Origin': '*',
   'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
 };
 
 serve(async (req) => {
   if (req.method === 'OPTIONS') {
     return new Response(null, { headers: corsHeaders });
   }
 
   try {
     const { imageBase64, billType } = await req.json();
     
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
 
     console.log(`Processing ${billType} bill image for OCR extraction...`);
 
     let systemPrompt = "";
     
    if (billType === "fiserv") {
      systemPrompt = `You are a data extraction assistant for Bank Card / Fiserv / Pine Labs payment receipts and bill registers.

The image may be ONE of these formats:
1. A spreadsheet/Excel table screenshot with columns like: Sl.No, DATE, INVOICE NO, TIME, CARD NO, AMOUNT — containing MANY rows.
2. A Pine Labs / POS "Settlement Report" / "Details Report" printout listing multiple transactions (each with INVOICE NUMBER, CARD NUMBER, TRANSACTION TYPE/CARD TYPE, AUTHCODE, AMOUNT). The header has a Date and Time.
3. A single transaction merchant slip with one BILL NUM / INVOICE / TXN, card last digits, BASE AMT, DATE and TIME.

Extract ALL transactions visible (do NOT stop at one). Return strict JSON in this shape:

{
  "entries": [
    {
      "bill_date": "YYYY-MM-DD",
      "bill_time": "HH:mm:ss",
      "invoice_number": "string",
      "card_last_four": "string (last 4 digits only — strip asterisks/spaces)",
      "amount": number
    }
  ]
}

Rules:
- "card_last_four": always the LAST 4 digits of the card number shown (e.g. "************9307" -> "9307", "************7516" -> "7516"). For spreadsheet rows where CARD NO column shows a short number like 413 / 8 / 0 — use that value as-is (digits only).
- "invoice_number": Use the INVOICE NO / INVOICE NUMBER / BILL NUM value as a plain string.
- "amount": numeric only (strip "RS", "Rs.", commas). E.g. "RS3950.48" -> 3950.48, "1,869.60" -> 1869.60.
- "bill_date": Convert formats like "04.04.2026", "2026-04-22", "22/04/2026" to YYYY-MM-DD. For multi-transaction settlement reports, use the report header Date for every entry unless a per-row date is shown.
- "bill_time": Use HH:mm:ss 24-hour. For settlement Details Reports without per-row times, use the report header Time for every entry.
- Skip rows that are clearly empty (Sl.No present but no invoice/amount).
- Return ONLY the JSON object — no markdown, no commentary.`;
    } else {
      systemPrompt = `You are a data extraction assistant for Bharat Fleet Card payment receipts/bills.

The image may be a single slip OR a multi-row register/settlement listing. Extract ALL visible transactions.

Return strict JSON:
{
  "entries": [
    {
      "bill_date": "YYYY-MM-DD",
      "bill_time": "HH:mm:ss",
      "account_no": "string",
      "card_id": "string",
      "amount": number
    }
  ]
}

Rules:
- Strip "RS"/commas from amount; return numeric.
- Convert any date format to YYYY-MM-DD and time to 24h HH:mm:ss.
- If a header date/time applies to all rows, use it for each entry.
- Return ONLY the JSON object.`;
    }
 
     const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
       method: "POST",
       headers: {
         Authorization: `Bearer ${LOVABLE_API_KEY}`,
         "Content-Type": "application/json",
       },
       body: JSON.stringify({
         model: "google/gemini-2.5-flash",
         messages: [
           { role: "system", content: systemPrompt },
           { 
             role: "user", 
             content: [
                {
                  type: "text",
                  text: "Analyze this image carefully. If it shows a TABLE or SETTLEMENT REPORT with multiple rows/transactions, extract EVERY row into the entries array. If it's a single slip, return one entry. Return JSON only."
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
 
     let extractedData = {};
     try {
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