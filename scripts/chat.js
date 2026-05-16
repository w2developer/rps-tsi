// --- CONFIGURAÇÃO (Igual ao seu main.js) ---
const supabaseUrl = 'https://rtrjdiocezpityurvhpb.supabase.co';
const supabaseKey = 'sb_publishable_Y9Jrgq2ylUEbcPGMG74fng_i5I0s5Oq';
const _supabase = supabase.createClient(supabaseUrl, supabaseKey);

// 1. Enviar Mensagem
async function enviarMensagem() {
    const input = document.getElementById('input-mensagem');
    const usuarioLogado = JSON.parse(sessionStorage.getItem('usuario_logado'));

    if (!input.value.trim()) return;

    await _supabase.from('mensagens_chat').insert([{
        remetente_nome: usuarioLogado ? usuarioLogado.nome : "Membro da Equipe",
        remetente_cargo: usuarioLogado ? usuarioLogado.cargo : "Geral",
        conteudo_mensagem: input.value
    }]);

    input.value = ''; // Limpa o campo após enviar
}

// 2. Renderizar a Mensagem na Tela
function exibirNovaMensagem(dadosMensagem) {
    const zonaMensagens = document.getElementById('zona-mensagens');
    if (!zonaMensagens) return;

    const div = document.createElement('div');
    div.className = 'mensagem-item';
    div.innerHTML = `
        <small><strong>${dadosMensagem.remetente_nome}</strong> (${dadosMensagem.remetente_cargo})</small>
        <p>${dadosMensagem.conteudo_mensagem}</p>
    `;
    
    zonaMensagens.appendChild(div);
    zonaMensagens.scrollTop = zonaMensagens.scrollHeight; // Rola o chat para o fim automaticamente
}

// 3. SEGREDO: Escutar o Banco em Tempo Real (Supabase Realtime)
_supabase
  .channel('canal-da-equipe')
  .on('postgres_changes', { event: 'INSERT', scheme: 'public', table: 'mensagens_chat' }, payload => {
      // Sempre que alguém inserir uma mensagem no banco, essa função roda na hora para todo mundo!
      exibirNovaMensagem(payload.new);
  })
  .subscribe();