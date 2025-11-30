import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailNotification {
  type: "ticket_assigned" | "ticket_status_changed" | "ticket_comment" | "ticket_resolved" | "user_created";
  recipientEmail: string;
  recipientName: string;
  data: any;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, recipientEmail, recipientName, data }: EmailNotification = await req.json();

    // For now, just log the notification request so the frontend can continue to work
    console.log("[send-notification] Notification requested", {
      type,
      recipientEmail,
      recipientName,
      dataSummary: data ? Object.keys(data) : [],
      timestamp: new Date().toISOString(),
    });

    return new Response(
      JSON.stringify({
        success: true,
        message:
          "Notification logged. Email sending is currently disabled because the Resend npm package is not available in this environment.",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("[send-notification] Error handling request:", error);

    return new Response(JSON.stringify({ error: error.message || "Unknown error" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
