// La suppression d'un compte, côté serveur.
//
// L'app ne peut pas supprimer un compte elle-même : il y faut la clé de service,
// qui ouvre tout et ne doit donc jamais quitter le serveur. C'est le seul endroit
// où elle est lue, et elle vient de l'environnement de la fonction, jamais d'un
// fichier du dépôt.
//
// Ce que fait la fonction, dans cet ordre : vérifier qui appelle, effacer ses
// lignes, puis son compte. Les tables sont en `on delete cascade` depuis
// `auth.users`, donc la dernière étape suffirait — mais on efface d'abord, pour
// que la suppression du compte ne puisse pas laisser derrière elle des chants
// orphelins si la cascade venait à être retirée.
//
// Déploiement : `supabase functions deploy delete-account`

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (request.method !== 'POST') return json({ error: 'method' }, 405);

  // Le jeton de l'appelant, et rien d'autre : la fonction n'agit jamais pour un
  // compte qu'on ne lui a pas prouvé.
  const authorization = request.headers.get('Authorization') ?? '';
  const token = authorization.replace(/^Bearer\s+/i, '');
  if (!token) return json({ error: 'unauthorized' }, 401);

  const url = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !serviceKey) return json({ error: 'not configured' }, 500);

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) return json({ error: 'unauthorized' }, 401);
  const userId = data.user.id;

  // L'ordre compte : les réponses, puis les places, puis les sets et les chants.
  // Une liste vide n'est jamais passée à `in` : PostgREST la refuse, et un compte
  // sans set est le cas le plus courant.
  await admin.from('progress_events').delete().eq('user_id', userId);
  const { data: owned } = await admin.from('sets').select('id').eq('user_id', userId);
  const setIds = (owned ?? []).map((row) => row.id as string);
  if (setIds.length) await admin.from('set_songs').delete().in('set_id', setIds);
  await admin.from('sets').delete().eq('user_id', userId);
  await admin.from('songs').delete().eq('user_id', userId);
  await admin.from('profiles').delete().eq('id', userId);

  const { error: gone } = await admin.auth.admin.deleteUser(userId);
  if (gone) return json({ error: 'delete failed' }, 500);

  return json({ ok: true });
});
