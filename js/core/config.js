/**
 * Configuração do Supabase — Pains Acontece
 *
 * 1. Crie um projeto em https://supabase.com (grátis)
 * 2. Vá em Settings → API e copie:
 *    - Project URL  → supabaseUrl
 *    - anon public  → supabaseAnonKey
 * 3. Execute supabase/schema.sql no SQL Editor
 * 4. Crie usuário admin em Authentication → Users (não commite senhas)
 * 5. Cole as chaves abaixo e faça commit no GitHub
 */
const PAConfig = {
  supabaseUrl: 'https://blcomwofpyorypqjdhfb.supabase.co',
  supabaseAnonKey: 'sb_publishable_Kkznz1j873N8ztepzRDCcQ__eXd6MXS',
  ownerEmail: 'admin@painsacontece.com.br',
  siteUrl: 'https://rdzindu7.github.io/pains-acontece',
  githubSync: {
    owner: 'rdzindu7',
    repo: 'pains-acontece',
    branch: 'main',
    path: 'data/articles.json',
    token: ''
  },
  verifiedPlan: {
    name: 'Selo Verificado Pains Acontece',
    price: 29.9,
    currency: 'BRL',
    period: 'anual',
    benefits: [
      { icon: 'fa-check-circle', title: 'Selo azul no perfil', desc: 'Seu nome exibe o selo verificado em todo o portal.' },
      { icon: 'fa-star', title: 'Comentários em destaque', desc: 'Suas opiniões aparecem com borda dourada e prioridade no topo.' },
      { icon: 'fa-bolt', title: 'Reações ilimitadas', desc: 'Curta e reaja a todas as publicações sem limite.' },
      { icon: 'fa-id-card', title: 'Perfil personalizado', desc: 'Bio, foto, local e link — você edita como quiser.' },
      { icon: 'fa-shield-alt', title: 'Credibilidade local', desc: 'Identidade reconhecida pela redação Pains Acontece.' },
      { icon: 'fa-headset', title: 'Suporte prioritário', desc: 'Atendimento preferencial pela equipe IA do portal.' }
    ]
  }
};