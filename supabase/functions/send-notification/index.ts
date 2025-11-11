import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

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

    let subject = "";
    let html = "";

    switch (type) {
      case "user_created":
        subject = "Welcome to BroDesk - Your Account Credentials";
        html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #333;">Welcome to BroDesk!</h1>
            <p>Hello ${recipientName},</p>
            <p>An administrator has created an account for you. Here are your login credentials:</p>
            <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p><strong>Email:</strong> ${recipientEmail}</p>
              <p><strong>Temporary Password:</strong> ${data.temporaryPassword}</p>
              <p><strong>Role:</strong> ${data.role}</p>
              ${data.team ? `<p><strong>Team:</strong> ${data.team}</p>` : ''}
            </div>
            <p><strong>Next Steps:</strong></p>
            <ol>
              <li>Go to <a href="${data.appUrl}/auth">${data.appUrl}/auth</a></li>
              <li>Log in with your credentials</li>
              <li>Change your password immediately after first login</li>
            </ol>
            <p style="color: #666; margin-top: 30px;">If you didn't expect this email, please contact your administrator.</p>
          </div>
        `;
        break;

      case "ticket_assigned":
        subject = `Ticket ${data.ticketNumber} Assigned to You`;
        html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #333;">New Ticket Assignment</h1>
            <p>Hello ${recipientName},</p>
            <p>A ticket has been assigned to you:</p>
            <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin: 0 0 10px 0;">${data.title}</h3>
              <p><strong>Ticket #:</strong> ${data.ticketNumber}</p>
              <p><strong>Priority:</strong> <span style="text-transform: capitalize;">${data.priority}</span></p>
              <p><strong>Category:</strong> ${data.category}</p>
              <p><strong>Description:</strong> ${data.description}</p>
            </div>
            <a href="${data.ticketUrl}" style="display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 10px;">View Ticket</a>
          </div>
        `;
        break;

      case "ticket_status_changed":
        subject = `Ticket ${data.ticketNumber} Status Updated`;
        html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #333;">Ticket Status Updated</h1>
            <p>Hello ${recipientName},</p>
            <p>The status of your ticket has been updated:</p>
            <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin: 0 0 10px 0;">${data.title}</h3>
              <p><strong>Ticket #:</strong> ${data.ticketNumber}</p>
              <p><strong>Old Status:</strong> <span style="text-transform: capitalize;">${data.oldStatus.replace('_', ' ')}</span></p>
              <p><strong>New Status:</strong> <span style="text-transform: capitalize; color: #10b981;">${data.newStatus.replace('_', ' ')}</span></p>
            </div>
            <a href="${data.ticketUrl}" style="display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 10px;">View Ticket</a>
          </div>
        `;
        break;

      case "ticket_comment":
        subject = `New Comment on Ticket ${data.ticketNumber}`;
        html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #333;">New Comment on Your Ticket</h1>
            <p>Hello ${recipientName},</p>
            <p>${data.commenterName} added a comment to your ticket:</p>
            <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin: 0 0 10px 0;">${data.title}</h3>
              <p><strong>Ticket #:</strong> ${data.ticketNumber}</p>
              <div style="background: white; padding: 15px; border-left: 3px solid #3b82f6; margin-top: 15px;">
                <p style="margin: 0;"><strong>${data.commenterName}:</strong></p>
                <p style="margin: 10px 0 0 0;">${data.comment}</p>
              </div>
            </div>
            <a href="${data.ticketUrl}" style="display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 10px;">View Ticket</a>
          </div>
        `;
        break;

      case "ticket_resolved":
        subject = `Ticket ${data.ticketNumber} Resolved`;
        html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #10b981;">✓ Ticket Resolved</h1>
            <p>Hello ${recipientName},</p>
            <p>Your ticket has been resolved:</p>
            <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin: 0 0 10px 0;">${data.title}</h3>
              <p><strong>Ticket #:</strong> ${data.ticketNumber}</p>
              <p><strong>Resolved by:</strong> ${data.resolvedBy}</p>
              <p style="color: #10b981; margin-top: 15px;"><strong>Status:</strong> Resolved</p>
            </div>
            <p>If you need further assistance, you can reopen this ticket or submit a new one.</p>
            <a href="${data.ticketUrl}" style="display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 10px;">View Ticket</a>
          </div>
        `;
        break;

      default:
        throw new Error("Unknown notification type");
    }

    const emailResponse = await resend.emails.send({
      from: "BroDesk <onboarding@resend.dev>",
      to: [recipientEmail],
      subject,
      html,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending email:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
