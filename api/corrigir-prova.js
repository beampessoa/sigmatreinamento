// ============================================================
// /api/corrigir-prova  —  corrige a tentativa e emite o selo
//
// Recebe { token, tentativa_id, respostas }.
//   respostas = { "<questao_id>": "<alternativa_id>", ... }
// Resolve a pessoa pelo token, confirma que a tentativa é DELA
// (para ninguém corrigir a prova de outro) e chama
// sigmatr.corrigir_prova — que corrige por peso e, se aprovar,
// JÁ emite o selo automaticamente. Nada de correção mora aqui.
// ============================================================

import { createClient } from '@supabase/supabase-js';

const db = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { db: { schema: 'sigmatr' }, auth: { persistSession: false } }
);

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    return res.status(405).json({ erro: 'Método não permitido' });
  }

  const b = req.body || {};
  const token = (b.token || '').trim();
  if (!token || !b.tentativa_id || !b.respostas) {
    return res.status(400).json({ erro: 'Requisição incompleta' });
  }

  // 1. token → pessoa_id
  const { data: pid, error: e1 } = await db.rpc('pessoa_por_token', { p_token: token });
  if (e1)  return res.status(500).json({ erro: 'Falha ao validar o acesso' });
  if (!pid) return res.status(401).json({ erro: 'Acesso não reconhecido' });

  // 2. a tentativa é desta pessoa? (impede corrigir a prova de outro)
  const { data: t, error: e2 } = await db
    .from('tentativas')
    .select('pessoa_id, finalizada_em')
    .eq('id', b.tentativa_id)
    .maybeSingle();

  if (e2)              return res.status(500).json({ erro: 'Falha ao validar a tentativa' });
  if (!t)              return res.status(404).json({ erro: 'Tentativa não encontrada' });
  if (t.pessoa_id !== pid) return res.status(403).json({ erro: 'Esta tentativa não é sua' });

  // 3. corrige (e emite o selo se aprovar — tudo dentro da função)
  const { data, error } = await db.rpc('corrigir_prova', {
    p_tentativa_id: b.tentativa_id,
    p_respostas:    b.respostas
  });

  if (error) {
    return res.status(422).json({ erro: error.message || 'Não foi possível corrigir a prova' });
  }

  const r = Array.isArray(data) ? data[0] : data;

  return res.status(200).json({
    nota:        r.nota,
    nota_minima: r.nota_minima,
    aprovado:    r.aprovado,
    acertos:     r.acertos,
    total:       r.total,
    erros:       r.erros,
    assuntos:    r.assuntos || [],
    proxima_em:  r.proxima_em
  });
}
