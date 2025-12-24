import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';
import Stripe from 'https://esm.sh/stripe@18.5.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('Missing authorization header');
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      console.error('Invalid authentication token:', authError?.message);
      return new Response(JSON.stringify({ error: 'Invalid authentication token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('Authenticated user:', user.id, user.email);

    const { packageId } = await req.json();
    
    if (!packageId) {
      throw new Error('Package ID is required');
    }

    // Use service role for package lookup to bypass RLS
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get package details
    const { data: packageData, error: packageError } = await supabaseAdmin
      .from('credit_packages')
      .select('*')
      .eq('id', packageId)
      .eq('is_active', true)
      .maybeSingle();

    if (packageError) {
      console.error('Package query error:', packageError);
      throw new Error('Error fetching package');
    }

    if (!packageData) {
      console.error('Package not found for id:', packageId);
      throw new Error('Package not found');
    }

    console.log('Package found:', packageData.name, packageData.credits, 'credits for', packageData.price_cents, 'cents');

    // Initialize Stripe
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) {
      throw new Error('Stripe not configured');
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: '2025-08-27.basil',
    });

    // Check if customer exists
    const customers = await stripe.customers.list({
      email: user.email,
      limit: 1,
    });

    let customerId: string;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    } else {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          supabase_user_id: user.id,
        },
      });
      customerId = customer.id;
    }

    console.log('Stripe customer:', customerId);

    // Create Stripe Checkout Session
    const origin = req.headers.get('origin') || 'https://mfwqlhmxojxbikfhqeaw.supabase.co';
    
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [
        {
          price_data: {
            currency: 'brl',
            product_data: {
              name: `${packageData.name} - ${packageData.credits} Créditos`,
              description: `Pacote de ${packageData.credits} créditos para cálculo de frete`,
            },
            unit_amount: packageData.price_cents,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${origin}/credits?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/credits?canceled=true`,
      metadata: {
        user_id: user.id,
        package_id: packageData.id,
        package_name: packageData.name,
        credits: packageData.credits.toString(),
        price_cents: packageData.price_cents.toString(),
      },
      payment_intent_data: {
        metadata: {
          user_id: user.id,
          package_id: packageData.id,
          credits: packageData.credits.toString(),
        },
      },
      expires_at: Math.floor(Date.now() / 1000) + 1800, // 30 min expiration
    });

    console.log('Checkout session created:', session.id, 'URL:', session.url);

    // Record pending transaction using admin client
    const { error: insertError } = await supabaseAdmin.from('credit_transactions').insert({
      user_id: user.id,
      amount: packageData.credits,
      type: 'purchase',
      description: `Compra: ${packageData.name}`,
      stripe_session_id: session.id,
      package_name: packageData.name,
      package_price_cents: packageData.price_cents,
      status: 'pending',
    });

    if (insertError) {
      console.error('Error recording pending transaction:', insertError);
      // Don't throw - the checkout was created successfully
    }

    return new Response(JSON.stringify({ 
      url: session.url,
      sessionId: session.id,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('Error creating checkout:', errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
