import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, title, description } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let result: any = {};

    if (type === 'predict_category') {
      // Get all categories
      const { data: categories } = await supabase
        .from('categories')
        .select('id, name, description');

      const categoryList = categories?.map(c => `${c.name}: ${c.description || 'No description'}`).join('\n') || '';

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "system",
              content: `You are a ticket categorization assistant. Given a ticket title and description, predict the most appropriate category from the available options. Return ONLY the category name that best matches.`
            },
            {
              role: "user",
              content: `Available categories:\n${categoryList}\n\nTicket Title: ${title}\nTicket Description: ${description}\n\nWhich category best fits this ticket? Return only the category name.`
            }
          ],
        }),
      });

      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "AI rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits depleted. Please add credits to continue." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!response.ok) {
        throw new Error(`AI API error: ${response.status}`);
      }

      const data = await response.json();
      const predictedCategory = data.choices[0].message.content.trim();
      
      // Find the matching category
      const matchedCategory = categories?.find(c => 
        c.name.toLowerCase() === predictedCategory.toLowerCase()
      );

      result = {
        predicted_category_id: matchedCategory?.id || null,
        predicted_category_name: matchedCategory?.name || predictedCategory,
        confidence: matchedCategory ? 'high' : 'low'
      };
    }

    if (type === 'check_duplicates') {
      // Get recent tickets
      const { data: recentTickets } = await supabase
        .from('tickets')
        .select('id, ticket_number, title, description, status')
        .neq('status', 'closed')
        .order('created_at', { ascending: false })
        .limit(50);

      if (!recentTickets || recentTickets.length === 0) {
        result.duplicates = [];
      } else {
        const ticketsList = recentTickets.map(t => 
          `[${t.ticket_number}] ${t.title}: ${t.description.substring(0, 100)}`
        ).join('\n');

        const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              {
                role: "system",
                content: `You are a duplicate detection assistant. Analyze if a new ticket is similar to existing tickets. Return a JSON array of ticket numbers that are potential duplicates. If no duplicates found, return an empty array. Format: ["BRO00001", "BRO00002"]`
              },
              {
                role: "user",
                content: `New Ticket:\nTitle: ${title}\nDescription: ${description}\n\nExisting Tickets:\n${ticketsList}\n\nReturn only a JSON array of duplicate ticket numbers, or [] if none found.`
              }
            ],
          }),
        });

        if (!response.ok) {
          console.error('Duplicate check failed:', response.status);
          result.duplicates = [];
        } else {
          const data = await response.json();
          const content = data.choices[0].message.content.trim();
          
          try {
            const duplicateNumbers = JSON.parse(content);
            const duplicateTickets = recentTickets.filter(t => 
              duplicateNumbers.includes(t.ticket_number)
            );
            result.duplicates = duplicateTickets.map(t => ({
              ticket_number: t.ticket_number,
              title: t.title,
              id: t.id
            }));
          } catch {
            result.duplicates = [];
          }
        }
      }
    }

    if (type === 'analyze_sentiment') {
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "system",
              content: `You are a sentiment analysis assistant. Analyze the sentiment and urgency of a support ticket. Return a JSON object with:
- sentiment: "positive", "neutral", or "negative"
- urgency: "low", "medium", "high", or "urgent"
- score: a number from 0 to 1 representing intensity (0 = calm, 1 = very upset/urgent)
- reasoning: brief explanation

Format: {"sentiment": "negative", "urgency": "high", "score": 0.8, "reasoning": "..."}`
            },
            {
              role: "user",
              content: `Ticket Title: ${title}\nTicket Description: ${description}\n\nAnalyze the sentiment and urgency.`
            }
          ],
        }),
      });

      if (!response.ok) {
        throw new Error(`Sentiment analysis failed: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices[0].message.content.trim();
      
      try {
        const sentiment = JSON.parse(content);
        result.sentiment = sentiment;
      } catch {
        result.sentiment = {
          sentiment: 'neutral',
          urgency: 'medium',
          score: 0.5,
          reasoning: 'Unable to analyze'
        };
      }
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in ai-ticket-analysis:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
