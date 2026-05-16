(function() {
    // Carrega dependências externas necessárias
    const dependencies = [
        { type: 'css', url: 'https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600&display=swap' },
        { type: 'css', url: 'https://cdn.jsdelivr.net/npm/remixicon@4.2.0/fonts/remixicon.css' },
        { type: 'css', url: '/styles/chat-widget.css' },
        { type: 'js', url: 'https://cdn.jsdelivr.net/npm/sweetalert2@11' },
        { type: 'js', url: 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2' }
    ];

    dependencies.forEach(dep => {
        if (dep.type === 'css') {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = dep.url;
            document.head.appendChild(link);
        } else {
            const script = document.createElement('script');
            script.src = dep.url;
            script.async = false;
            document.head.appendChild(script);
        }
    });

    window.addEventListener('DOMContentLoaded', () => {
        const checkLibs = setInterval(() => {
            if (window.supabase && window.Swal) {
                clearInterval(checkLibs);
                initChatWidget();
            }
        }, 100);
    });

    function initChatWidget() {
        const supabaseUrl = 'https://rtrjdiocezpityurvhpb.supabase.co';
        const supabaseKey = 'sb_publishable_Y9Jrgq2ylUEbcPGMG74fng_i5I0s5Oq';
        const _supabase = supabase.createClient(supabaseUrl, supabaseKey);

        const usuarioAtivo = JSON.parse(sessionStorage.getItem('usuario_logado'));
        const MEU_ID = usuarioAtivo ? usuarioAtivo.nome : "Admin";

        let contatoAtivoId = null;
        let listaUsuariosLocal = [];
        let usuariosOnline = {};
        
        const widgetHTML = `
            <div class="rps-chat-widget">
                <div class="rps-chat-trigger-wrapper">
                    <button class="rps-chat-trigger" id="rpsChatBtn">
                        <i class="ri-chat-smile-2-line"></i>
                    </button>
                    <span class="rps-global-badge" id="rpsGlobalBadge">0</span>
                </div>
                <div class="rps-chat-container" id="rpsChatContainer">
                    <div class="rps-chat-header">
                        <div class="rps-user-info">
                            <span class="title">RPS Sistema Chat</span>
                            <span class="username" id="rpsLoggedUser">Carregando...</span>
                        </div>
                        <button class="rps-chat-close" id="rpsCloseChat"><i class="ri-close-line"></i></button>
                    </div>
                    
                    <div class="rps-chat-view" id="rpsContactsView">
                        <div class="rps-contacts-list" id="rpsContactsList"></div>
                    </div>

                    <div class="rps-chat-view rps-hidden" id="rpsConversationView">
                        <div class="rps-sub-header">
                            <button class="rps-back-btn" id="rpsBackBtn"><i class="ri-arrow-left-line"></i></button>
                            <span id="rpsActiveChatName">Nome</span>
                        </div>
                        <div class="rps-messages-zone" id="rpsMessagesZone"></div>
                        <form class="rps-chat-input-form" id="rpsChatForm">
                            <input type="text" id="rpsInputMsg" placeholder="Sua mensagem..." required autocomplete="off">
                            <button type="submit" id="rpsSendBtn"><i class="ri-send-plane-2-fill"></i></button>
                        </form>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', widgetHTML);

        const chatBtn = document.getElementById('rpsChatBtn');
        const chatContainer = document.getElementById('rpsChatContainer');
        const closeChat = document.getElementById('rpsCloseChat');
        const contactsView = document.getElementById('rpsContactsView');
        const conversationView = document.getElementById('rpsConversationView');
        const backBtn = document.getElementById('rpsBackBtn');
        const rpsMessagesZone = document.getElementById('rpsMessagesZone');
        const rpsInputMsg = document.getElementById('rpsInputMsg');
        const rpsGlobalBadge = document.getElementById('rpsGlobalBadge');

        document.getElementById('rpsLoggedUser').textContent = `Logado como: ${MEU_ID}`;

        function atualizarContadorGlobal() {
            let total = 0;
            document.querySelectorAll('.rps-badge').forEach(badge => {
                if (badge.style.display !== 'none') {
                    total += parseInt(badge.textContent) || 0;
                }
            });

            if (total > 0 && !chatContainer.classList.contains('active')) {
                rpsGlobalBadge.textContent = total;
                rpsGlobalBadge.style.display = 'flex';
            } else {
                rpsGlobalBadge.style.display = 'none';
            }
        }

        chatBtn.addEventListener('click', () => {
            chatContainer.classList.toggle('active');
            if (chatContainer.classList.contains('active')) {
                rpsGlobalBadge.style.display = 'none';
            } else {
                atualizarContadorGlobal();
            }
        });
        
        closeChat.addEventListener('click', () => {
            chatContainer.classList.remove('active');
            atualizarContadorGlobal();
        });

        backBtn.addEventListener('click', () => {
            conversationView.classList.add('rps-hidden');
            contactsView.classList.remove('rps-hidden');
            contatoAtivoId = null;
            atualizarContadorGlobal();
        });

        async function inicializarChat() {
            const { data: usuarios } = await _supabase.from('usuarios').select('nome, cargo');
            if (!usuarios) return;

            listaUsuariosLocal = usuarios.filter(u => u.nome !== MEU_ID);
            
            const { data: naoLidas } = await _supabase
                .from('mensagens_privadas')
                .select('remetente_id')
                .eq('destinatario_id', MEU_ID)
                .eq('lida', false);

            renderizarListaContatos(naoLidas || []);
            atualizarContadorGlobal();
        }

        function renderizarListaContatos(mensagensNaoLidas) {
            const container = document.getElementById('rpsContactsList');
            container.innerHTML = '';

            listaUsuariosLocal.forEach(u => {
                const qtdNaoLidas = mensagensNaoLidas.filter(m => m.remetente_id === u.nome).length;
                const isOnline = usuariosOnline[u.nome];

                const div = document.createElement('div');
                div.className = 'rps-contact-item';
                div.innerHTML = `
                    <div class="rps-contact-details">
                        <div class="rps-avatar-wrapper">
                            <i class="ri-user-3-line" style="font-size: 20px; color:#555;"></i>
                            <span class="rps-status-dot ${isOnline ? 'online' : 'offline'}" id="rps-status-${u.nome}"></span>
                        </div>
                        <div class="rps-contact-text">
                            <span class="name">${u.nome}</span>
                            <span class="role">${u.cargo || 'Membro'}</span>
                        </div>
                    </div>
                    <span class="rps-badge" id="rps-badge-${u.nome}" style="display: ${qtdNaoLidas > 0 ? 'block' : 'none'}">${qtdNaoLidas}</span>
                `;
                
                div.onclick = () => selecionarContato(u.nome);
                container.appendChild(div);
            });
        }

        async function selecionarContato(nomeContato) {
            contatoAtivoId = nomeContato;
            document.getElementById('rpsActiveChatName').textContent = nomeContato;
            
            contactsView.classList.add('rps-hidden');
            conversationView.classList.remove('rps-hidden');

            const badge = document.getElementById(`rps-badge-${nomeContato}`);
            if (badge) badge.style.display = 'none';

            const meuIdTratado = MEU_ID.trim();
            const contatoTratado = nomeContato.trim();

            await _supabase
                .from('mensagens_privadas')
                .update({ lida: true })
                .eq('remetente_id', contatoTratado)
                .eq('destinatario_id', meuIdTratado);

            rpsMessagesZone.innerHTML = '';
            await carregarHistoricoPrivado();
            atualizarContadorGlobal();
        }

        async function carregarHistoricoPrivado() {
            if (!contatoAtivoId) return;

            const { data } = await _supabase
                .from('mensagens_privadas')
                .select('*')
                .or(`and(remetente_id.eq.${MEU_ID},destinatario_id.eq.${contatoAtivoId}),and(remetente_id.eq.${contatoAtivoId},destinatario_id.eq.${MEU_ID})`)
                .order('criado_em', { ascending: true });

            if (data) data.forEach(msg => exibirMensagemNaTela(msg));
        }

        function exibirMensagemNaTela(msg) {
            const div = document.createElement('div');
            div.className = 'rps-msg-container';
            div.id = `rps-msg-container-${msg.id}`;

            const isMe = msg.remetente_id === MEU_ID;
            const hora = new Date(msg.criado_em).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            
            let checkHTML = '';
            if (isMe) {
                checkHTML = msg.lida 
                    ? `<i class="ri-checkbox-circle-fill rps-icon-read"></i>` 
                    : `<i class="ri-checkbox-blank-circle-line"></i>`;
            }

            if (isMe) {
                div.innerHTML = `
                    <div class="rps-msg-item-wrapper">
                        <button class="rps-msg-delete-btn" onclick="window.rpsDeletarMensagem(${msg.id})" title="Excluir mensagem">
                            <i class="ri-delete-bin-line"></i>
                        </button>
                        <div class="rps-msg-box me">
                            <span class="rps-msg-text">${msg.conteudo_mensagem}</span>
                            <div class="rps-msg-footer">
                                <span>${hora}</span>
                                ${checkHTML}
                            </div>
                        </div>
                    </div>
                `;
            } else {
                div.innerHTML = `
                    <div class="rps-msg-box other">
                        <span class="rps-msg-text">${msg.conteudo_mensagem}</span>
                        <div class="rps-msg-footer">
                            <span>${hora}</span>
                        </div>
                    </div>
                `;
            }
            
            rpsMessagesZone.appendChild(div);
            rpsMessagesZone.scrollTop = rpsMessagesZone.scrollHeight;
        }

        document.getElementById('rpsChatForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const texto = rpsInputMsg.value.trim();
            if (!texto || !contatoAtivoId) return;

            rpsInputMsg.value = '';

            await _supabase.from('mensagens_privadas').insert([{
                remetente_id: MEU_ID,
                remetente_nome: MEU_ID,
                destinatario_id: contatoAtivoId,
                conteudo_mensagem: texto,
                lida: false
            }]);
        });

        window.rpsDeletarMensagem = async function(id) {
            const resultado = await Swal.fire({
                target: document.getElementById('rpsChatContainer'),
                title: 'Excluir mensagem?',
                text: "Essa ação não poderá ser desfeita!",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#dc3545',
                cancelButtonColor: '#6e7881',
                confirmButtonText: 'Sim, excluir!',
                cancelButtonText: 'Cancelar'
            });

            if (resultado.isConfirmed) {
                await _supabase.from('mensagens_privadas').delete().eq('id', id);
            }
        };

        // Escuta em Tempo Real (Realtime)
        _supabase
            .channel('canal-privado-avancado')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'mensagens_privadas' }, payload => {
                
                if (payload.eventType === 'INSERT') {
                    const novaMsg = payload.new;
                    const daConversaAtiva = (novaMsg.remetente_id.trim() === MEU_ID.trim() && novaMsg.destinatario_id.trim() === contatoAtivoId?.trim()) ||
                                           (novaMsg.remetente_id.trim() === contatoAtivoId?.trim() && novaMsg.destinatario_id.trim() === MEU_ID.trim());

                    if (daConversaAtiva) {
                        exibirMensagemNaTela(novaMsg);
                        if (novaMsg.destinatario_id.trim() === MEU_ID.trim()) {
                            _supabase.from('mensagens_privadas').update({ lida: true }).eq('id', novaMsg.id).then();
                        }
                    } else if (novaMsg.destinatario_id.trim() === MEU_ID.trim()) {
                        Swal.fire({
                            target: document.getElementById('rpsChatContainer'),
                            title: `Nova mensagem de ${novaMsg.remetente_id}`,
                            text: novaMsg.conteudo_mensagem,
                            icon: 'info',
                            toast: true,
                            position: 'bottom-left',
                            showConfirmButton: false,
                            timer: 4000
                        });
                        
                        const badge = document.getElementById(`rps-badge-${novaMsg.remetente_id.trim()}`);
                        if (badge) {
                            const atual = parseInt(badge.textContent) || 0;
                            badge.textContent = atual + 1;
                            badge.style.display = 'block';
                            atualizarContadorGlobal();
                        }
                    }
                }
                
                if (payload.eventType === 'UPDATE') {
                    const msgModificada = payload.new;
                    
                    if (msgModificada.remetente_id.trim() === MEU_ID.trim() && msgModificada.destinatario_id.trim() === contatoAtivoId?.trim() && msgModificada.lida) {
                        const checksNaoLidos = rpsMessagesZone.querySelectorAll('.ri-checkbox-blank-circle-line');
                        checksNaoLidos.forEach(el => {
                            el.className = 'ri-checkbox-circle-fill rps-icon-read';
                        });
                    }
                    
                    const daConversaAtiva = (msgModificada.remetente_id.trim() === MEU_ID.trim() && msgModificada.destinatario_id.trim() === contatoAtivoId?.trim()) ||
                                           (msgModificada.remetente_id.trim() === contatoAtivoId?.trim() && msgModificada.destinatario_id.trim() === MEU_ID.trim());
                                           
                    if (daConversaAtiva) {
                        const containerMsg = document.getElementById(`rps-msg-container-${msgModificada.id}`);
                        if (containerMsg) {
                            const textSpan = containerMsg.querySelector('.rps-msg-text');
                            if (textSpan) textSpan.textContent = msgModificada.conteudo_mensagem;
                        }
                    }
                }

                if (payload.eventType === 'DELETE') {
                    const msgDeletadaId = payload.old.id;
                    const elementoMsg = document.getElementById(`rps-msg-container-${msgDeletadaId}`);
                    if (elementoMsg) {
                        elementoMsg.style.transition = 'all 0.3s ease';
                        elementoMsg.style.opacity = '0';
                        elementoMsg.style.transform = 'scale(0.9)';
                        setTimeout(() => elementoMsg.remove(), 300);
                    }
                }
            })
            .subscribe();

        // Presença Online/Offline
        const canalPresenca = _supabase.channel('online-equipe');
        canalPresenca
            .on('presence', { event: 'sync' }, () => {
                const estadoPresenca = canalPresenca.presenceState();
                usuariosOnline = {};

                Object.keys(estadoPresenca).forEach(id => {
                    const info = estadoPresenca[id][0];
                    if (info && info.user) usuariosOnline[info.user] = true;
                });

                listaUsuariosLocal.forEach(u => {
                    const elStatus = document.getElementById(`rps-status-${u.nome}`);
                    if (elStatus) {
                        elStatus.className = usuariosOnline[u.nome] ? 'rps-status-dot online' : 'rps-status-dot offline';
                    }
                });
            })
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    await canalPresenca.track({ user: MEU_ID, online_at: new Date().toISOString() });
                }
            });

        inicializarChat();
    }
})();