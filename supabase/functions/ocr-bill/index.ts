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
       systemPrompt = `You are a data extraction assistant for Fiserv payment receipts/bills.
 Analyze the provided image and extract the following fields:
 
 {
   "bill_date": "YYYY-MM-DD format",
   "bill_time": "HH:mm:ss format (24-hour)",
   "invoice_number": "string - the invoice/receipt number",
   "card_last_four": "string - last 4 digits of the card used",
   "amount": number - the transaction amount
 }
 
 Only include fields that you can clearly identify from the image.
 If you cannot find a field, omit it from the response.
 IMPORTANT: Return ONLY the JSON object, no markdown formatting or explanation.`;
     } else {
       systemPrompt = `You are a data extraction assistant for Bharat Fleet Card payment receipts/bills.
 Analyze the provided image and extract the following fields:
 
 {
   "bill_date": "YYYY-MM-DD format",
   "bill_time": "HH:mm:ss format (24-hour)",
   "account_no": "string - the account number",
   "card_id": "string - the card ID or number",
   "amount": number - the transaction amount
 }
 
 Only include fields that you can clearly identify from the image.
 If you cannot find a field, omit it from the response.
 IMPORTANT: Return ONLY the JSON object, no markdown formatting or explanation.`;
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
                 text: "Please analyze this bill/receipt image and extract the data. Return the data as JSON."
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