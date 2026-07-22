// ============================================================
// /api/iniciar-prova  —  abre uma tentativa de prova
//
// Recebe { token, revisao_id }.
// Resolve a pessoa pelo token e chama sigmatr.iniciar_prova, que:
//   - valida se pode tentar (tentativas, cooldown),
//   - sorteia as questões,
//   - cria a linha em `tentativas`,
//   - devolve o payload SEM gabarito (a resposta certa não sai daqui).
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
  if (!token || !b.revisao_id) {
    return res.status(400).json({ erro: 'Requisição incompleta' });
  }

  // 1. token → pessoa_id
  const { data: pid, error: e1 } = await db.rpc('pessoa_por_token', { p_token: token });
  if (e1)  return res.status(500).json({ erro: 'Falha ao validar o acesso' });
  if (!pid) return res.status(401).json({ erro: 'Acesso não reconhecido' });

  // 2. inicia a prova (a função valida tentativas/cooldown e sorteia as questões)
  const { data, error } = await db.rpc('iniciar_prova', {
    p_pessoa_id: pid,
    p_revisao_id: b.revisao_id
  });

  if (error) {
    // Ex.: "assista o vídeo", "sem tentativas", "aguarde o cooldown", "prova sem questões".
    // A mensagem é voltada ao usuário — devolve como está.
    return res.status(422).json({ erro: error.message || 'Não foi possível iniciar a prova' });
  }

  // rpc que retorna TABLE vem como array de 1 linha
  const r = Array.isArray(data) ? data[0] : data;
  if (!r) return res.status(404).json({ erro: 'Prova não encontrada para esta revisão' });

  return res.status(200).json({
    tentativa_id: r.tentativa_id,
    numero:       r.numero,
    nota_minima:  r.nota_minima,
    questoes:     r.questoes || []
  });
}
