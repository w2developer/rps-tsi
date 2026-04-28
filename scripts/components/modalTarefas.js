// modalTarefas.js

function formatarDataHoraBR(dataISO) {
    if (!dataISO) return "---";
    const data = new Date(dataISO);
    const dia = String(data.getDate()).padStart(2, '0');
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const horas = String(data.getHours()).padStart(2, '0');
    const minutos = String(data.getMinutes()).padStart(2, '0');
    return `${dia}/${mes} às ${horas}:${minutos}`;
}

export async function abrirModalTarefas(alunoId, supabase) {
    // 1. Cria e mostra o modal IMEDIATAMENTE
    const modalDiv = document.createElement('div');
    modalDiv.className = 'modal';
    modalDiv.id = 'modal-tarefas';
    modalDiv.style.display = 'flex';

    // Conteúdo inicial com um aviso de "Carregando"
    modalDiv.innerHTML = `
        <div class="card-modal">
            <div class="header-modal">
                <h2>Lista de Tarefas</h2>
            </div>
            <div class="body-modal">
                <div id="loading-tarefas" style="text-align: center; padding: 20px;">
                    <i class="ri-loader-4-line ri-spin" style="font-size: 2rem;"></i>
                    <p>Buscando tarefas...</p>
                </div>
                <div id="conteudo-modal-tarefas" style="display: none;">
                    <form id="form-tarefa" style="margin-bottom: 20px; display: flex; gap: 10px;">
                        <input type="text" id="desc-tarefa" placeholder="Nova tarefa..." required style="flex: 1; padding: 8px;">
                        <button type="submit" class="status certificado" style="cursor: pointer; border: none; padding: 8px 15px;">
                            <i class="ri-add-line"></i>
                        </button>
                    </form>
                    <table>
                        <thead>
                            <tr>
                                <th>Tarefa</th>
                                <th>Criada em</th> 
                                <th style="text-align: center;">Ações</th>
                            </tr>
                        </thead>
                        <tbody id="lista-tarefas-corpo"></tbody>
                    </table>
                </div>
            </div>
            <div class="footer-modal">
                <button id="fechar-modal-tarefas">Fechar</button>
            </div>
        </div>
    `;

    document.body.appendChild(modalDiv);

    // Fechar modal
    document.getElementById('fechar-modal-tarefas').onclick = () => modalDiv.remove();

    // 2. Busca os dados em segundo plano
    const { data: tarefas, error } = await supabase
        .from('tarefas')
        .select('*')
        .eq('aluno_id', alunoId)
        .order('concluida', { ascending: true })
        .order('criado_em', { ascending: false });

    if (error) {
        document.getElementById('loading-tarefas').innerHTML = `<p style="color: red;">Erro ao carregar.</p>`;
        return;
    }

    // 3. Preenche os dados e troca o "Carregando" pelo conteúdo
    const corpoTabela = document.getElementById('lista-tarefas-corpo');
    corpoTabela.innerHTML = (tarefas || []).map(t => `
        <tr style="${t.concluida ? 'opacity: 0.5; text-decoration: line-through;' : ''}">
            <td style="white-space: wrap;">${t.descricao}</td>
            <td style="font-size: 0.85rem; color: #666;">${formatarDataHoraBR(t.criado_em)}</td>
            <td class="operacoes" style="justify-content: center;">
                ${!t.concluida ? `
                    <button class="btn-presenca" onclick="window.concluirTarefa(${t.id}, ${alunoId})">
                        <i class="ri-check-line"></i>
                    </button>
                ` : '<i class="ri-checkbox-circle-fill" style="color: green; font-size: 1.2rem;"></i>'}
                <button class="btn-excluir" onclick="window.deletarTarefa(${t.id}, ${alunoId})">
                    <i class="ri-delete-bin-fill"></i>
                </button>
            </td>
        </tr>
    `).join('');

    document.getElementById('loading-tarefas').style.display = 'none';
    document.getElementById('conteudo-modal-tarefas').style.display = 'block';

    // 4. Configura o envio do formulário (agora que ele existe no DOM)
    document.getElementById('form-tarefa').onsubmit = async (e) => {
        e.preventDefault();
        const descInput = document.getElementById('desc-tarefa');
        const { error: insError } = await supabase.from('tarefas').insert([{ aluno_id: alunoId, descricao: descInput.value }]);

        if (!insError) {
            modalDiv.remove();
            abrirModalTarefas(alunoId, supabase);
            if (typeof window.carregarAlunos === 'function') window.carregarAlunos();
        }
    };
}