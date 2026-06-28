import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { AwsClient } from 'https://esm.sh/aws4fetch@1'

const TTL_SECONDS = 300

Deno.serve(async (req: Request) => {
  const origin = req.headers.get('Origin') ?? ''
  const siteUrl = Deno.env.get('SITE_URL') ?? ''
  const isAllowed = origin === siteUrl || origin.startsWith('http://localhost')
  const corsHeaders = {
    'Access-Control-Allow-Origin': isAllowed ? origin : '',
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

  const { trackId, fileName, mimeType } = await req.json()
  if (!trackId || !fileName || !mimeType) {
    return new Response(JSON.stringify({ error: 'trackId, fileName, mimeType required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Verify caller is a contributor on this track's project
  const { data: track, error: tErr } = await supabase
    .from('tracks')
    .select('project_id')
    .eq('id', trackId)
    .single()

  if (tErr || !track) {
    return new Response(JSON.stringify({ error: 'Track not found or access denied' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const { data: membership } = await supabase
    .from('project_members')
    .select('role')
    .eq('project_id', track.project_id)
    .eq('user_id', user.id)
    .in('role', ['owner', 'contributor'])
    .single()

  if (!membership) {
    return new Response(JSON.stringify({ error: 'Insufficient permissions' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const ext = fileName.split('.').pop()?.toLowerCase() ?? 'mp3'
  const uuid = crypto.randomUUID()
  const audioKey = `${track.project_id}/${trackId}/${uuid}.${ext}`

  const r2 = new AwsClient({
    accessKeyId: Deno.env.get('R2_ACCESS_KEY_ID')!,
    secretAccessKey: Deno.env.get('R2_SECRET_ACCESS_KEY')!,
    region: 'auto',
    service: 's3',
  })

  const bucket = Deno.env.get('R2_BUCKET_NAME')!
  const endpoint = Deno.env.get('R2_ENDPOINT')!
  const url = new URL(`${endpoint}/${bucket}/${audioKey}`)
  url.searchParams.set('X-Amz-Expires', String(TTL_SECONDS))

  const signed = await r2.sign(
    new Request(url, {
      method: 'PUT',
      headers: { 'Content-Type': mimeType },
    }),
    { signQuery: true }
  )

  return new Response(
    JSON.stringify({ uploadUrl: signed.url, audioKey, expiresIn: TTL_SECONDS }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
})
