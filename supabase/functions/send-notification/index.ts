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
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, recipientEmail, recipientName, data }: EmailNotification = await req.json();

    // Log the notification request
    console.log("Email notification requested:", {
      type,
      recipientEmail,
      recipientName,
      timestamp: new Date().toISOString()
    });

    // TODO: Implement actual email sending with Resend
    // To enable email notifications:
    // 1. Sign up at https://resend.com
    // 2. Verify your domain at https://resend.com/domains
    // 3. Create API key at https://resend.com/api-keys
    // 4. Add RESEND_API_KEY secret to Supabase
    // 5. Uncomment the Resend code below

    /*
    // Uncomment when RESEND_API_KEY is configured
    import { Resend } from "npm:resend@2.0.0";
    const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
    
    let subject = "";
    let html = "";
    
    // Build email content based on type...
    
    const emailResponse = await resend.emails.send({
      from: "BroDesk <onboarding@resend.dev>",
      to: [recipientEmail],
      subject,
      html,
    });
    */

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Notification logged (email sending disabled - configure RESEND_API_KEY to enable)",
      data: { type, recipientEmail }
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in notification function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
