import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';
import Stripe from 'https://esm.sh/stripe@18.5.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
    
    if (!stripeKey) {
      console.error('STRIPE_SECRET_KEY not configured');
      throw new Error('Stripe not configured');
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: '2025-08-27.basil',
    });

    const signature = req.headers.get('stripe-signature');
    const body = await req.text();

    let event: Stripe.Event;

    if (webhookSecret && signature) {
      try {
        // Use async version for Deno compatibility
        event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
        console.log('Webhook signature verified successfully');
      } catch (err) {
        console.error('Webhook signature verification failed:', err);
        return new Response(JSON.stringify({ error: 'Invalid signature' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    } else {
      // For development without webhook secret
      event = JSON.parse(body);
      console.log('Warning: Webhook signature not verified (no secret configured)');
    }

    console.log('Received webhook event:', event.type);

    // Create Supabase client with service role for admin operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      
      console.log('Checkout session completed:', session.id);
      console.log('Payment status:', session.payment_status);
      console.log('Metadata:', session.metadata);

      if (session.payment_status === 'paid' && session.metadata) {
        const userId = session.metadata.user_id;
        const credits = parseInt(session.metadata.credits, 10);
        const packageName = session.metadata.package_name;
        const priceCents = parseInt(session.metadata.price_cents, 10);

        if (userId && credits > 0) {
          console.log(`Adding ${credits} credits to user ${userId}`);

          // Use the secure function to add credits
          const { data, error } = await supabaseAdmin.rpc('add_user_credits', {
            _user_id: userId,
            _amount: credits,
            _type: 'purchase',
            _description: `Compra via PIX/Cartão: ${packageName}`,
            _stripe_payment_intent_id: session.payment_intent as string,
            _stripe_session_id: session.id,
            _package_name: packageName,
            _package_price_cents: priceCents,
          });

          if (error) {
            console.error('Error adding credits:', error);
            throw error;
          }

          // Update pending transaction to completed
          await supabaseAdmin
            .from('credit_transactions')
            .update({ status: 'completed' })
            .eq('stripe_session_id', session.id)
            .eq('status', 'pending');

          console.log('Credits added successfully');
        }
      }
    }

    if (event.type === 'checkout.session.expired') {
      const session = event.data.object as Stripe.Checkout.Session;
      
      console.log('Checkout session expired:', session.id);

      // Update pending transaction to failed
      await supabaseAdmin
        .from('credit_transactions')
        .update({ status: 'failed' })
        .eq('stripe_session_id', session.id)
        .eq('status', 'pending');
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('Webhook error:', errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
