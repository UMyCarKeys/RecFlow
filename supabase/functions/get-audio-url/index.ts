import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { AwsClient } from 'https://esm.sh/aws4fetch@1'

const TTL_SECONDS = 900

Deno.serve(async (req: Request) => {
  const origin = req.headers.get('Origin') ?? ''
  const siteUrl = Deno.env.get('SITE_URL') ?? ''
  const corsHeaders = {
    'Access-Control-Allow-Origin': origin === siteUrl ? origin : '',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
  )

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const { versionId } = await req.json()
  if (!versionId) {
    return new Response(JSON.stringify({ error: 'versionId required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // RLS ensures only project members can see this version
  const { data: version, error: vErr } = await supabase
    .from('versions')
    .select('audio_key, tracks!inner(project_id)')
    .eq('id', versionId)
    .single()

  if (vErr || !version) {
    return new Response(JSON.stringify({ error: 'Version not found or access denied' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const r2 = new AwsClient({
    accessKeyId: Deno.env.get('R2_ACCESS_KEY_ID')!,
    secretAccessKey: Deno.env.get('R2_SECRET_ACCESS_KEY')!,
    region: 'auto',
    service: 's3',
  })

  const bucket = Deno.env.get('R2_BUCKET_NAME')!
  const endpoint = Deno.env.get('R2_ENDPOINT')!
  const url = new URL(`${endpoint}/${bucket}/${version.audio_key}`)
  url.searchParams.set('X-Amz-Expires', String(TTL_SECONDS))

  const signed = await r2.sign(new Request(url, { method: 'GET' }), { signQuery: true })

  return new Response(
    JSON.stringify({ url: signed.url, expiresIn: TTL_SECONDS }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
})
