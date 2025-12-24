import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// PIX EMV Code Generator
function generatePixCode(
  pixKey: string,
  pixKeyType: string,
  beneficiaryName: string,
  amount: number,
  transactionId: string,
  city: string = 'SAO PAULO'
): string {
  // EMV format for PIX
  const formatField = (id: string, value: string): string => {
    const length = value.length.toString().padStart(2, '0');
    return `${id}${length}${value}`;
  };

  // Merchant Account Information (ID 26)
  const gui = formatField('00', 'br.gov.bcb.pix');
  let pixKeyField: string;
  
  // Determine key type and format
  if (pixKeyType === 'cpf' || pixKeyType === 'cnpj') {
    pixKeyField = formatField('01', pixKey.replace(/\D/g, ''));
  } else if (pixKeyType === 'phone') {
    pixKeyField = formatField('01', '+55' + pixKey.replace(/\D/g, ''));
  } else if (pixKeyType === 'email') {
    pixKeyField = formatField('01', pixKey);
  } else {
    // Random key
    pixKeyField = formatField('01', pixKey);
  }

  const merchantAccountInfo = formatField('26', gui + pixKeyField);

  // Build PIX code parts
  const payloadFormatIndicator = formatField('00', '01');
  const merchantCategoryCode = formatField('52', '0000');
  const transactionCurrency = formatField('53', '986'); // BRL
  const transactionAmount = formatField('54', amount.toFixed(2));
  const countryCode = formatField('58', 'BR');
  const merchantName = formatField('59', beneficiaryName.substring(0, 25).toUpperCase());
  const merchantCity = formatField('60', city.substring(0, 15).toUpperCase());
  
  // Transaction ID (Additional Data Field)
  const txId = formatField('05', transactionId.substring(0, 25).toUpperCase());
  const additionalDataField = formatField('62', txId);

  // CRC placeholder
  const crcPlaceholder = '6304';

  // Assemble code without CRC
  const codeWithoutCRC = 
    payloadFormatIndicator +
    merchantAccountInfo +
    merchantCategoryCode +
    transactionCurrency +
    transactionAmount +
    countryCode +
    merchantName +
    merchantCity +
    additionalDataField +
    crcPlaceholder;

  // Calculate CRC16
  const crc = calculateCRC16(codeWithoutCRC);
  
  return codeWithoutCRC + crc;
}

function calculateCRC16(str: string): string {
  let crc = 0xFFFF;
  const polynomial = 0x1021;
  
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if (crc & 0x8000) {
        crc = (crc << 1) ^ polynomial;
      } else {
        crc = crc << 1;
      }
    }
    crc &= 0xFFFF;
  }
  
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
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
      return new Response(JSON.stringify({ error: 'Invalid authentication' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('PIX payment request from user:', user.id);

    const { packageId } = await req.json();
    
    if (!packageId) {
      throw new Error('Package ID is required');
    }

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

    if (packageError || !packageData) {
      console.error('Package error:', packageError);
      throw new Error('Package not found');
    }

    // Get PIX config
    const { data: pixConfig, error: pixError } = await supabaseAdmin
      .from('pix_config')
      .select('*')
      .eq('is_active', true)
      .maybeSingle();

    if (pixError || !pixConfig) {
      console.error('PIX config error:', pixError);
      throw new Error('PIX configuration not found');
    }

    console.log('Package:', packageData.name, 'PIX Key:', pixConfig.pix_key_type);

    // Generate unique transaction ID
    const transactionId = `FC${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    
    // Calculate amount in BRL
    const amountBRL = packageData.price_cents / 100;

    // Generate PIX EMV code
    const pixCode = generatePixCode(
      pixConfig.pix_key,
      pixConfig.pix_key_type,
      pixConfig.beneficiary_name,
      amountBRL,
      transactionId
    );

    console.log('Generated PIX code for transaction:', transactionId);

    // Create pending transaction
    const { data: transaction, error: insertError } = await supabaseAdmin
      .from('credit_transactions')
      .insert({
        user_id: user.id,
        amount: packageData.credits,
        type: 'purchase',
        description: `PIX: ${packageData.name}`,
        package_name: packageData.name,
        package_price_cents: packageData.price_cents,
        status: 'pending',
        stripe_session_id: `pix_${transactionId}`, // Reusing field for PIX ID
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating transaction:', insertError);
      throw new Error('Error creating transaction');
    }

    // Generate QR Code URL using Google Chart API (simple and reliable)
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(pixCode)}`;

    return new Response(JSON.stringify({
      success: true,
      pixCode,
      qrCodeUrl,
      transactionId,
      transactionDbId: transaction.id,
      amount: amountBRL,
      credits: packageData.credits,
      packageName: packageData.name,
      beneficiaryName: pixConfig.beneficiary_name,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 min expiration
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error creating PIX payment:', errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});