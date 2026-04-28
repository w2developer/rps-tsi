// components/modalEdicao.js

export async function abrirModalEdicao(alunoId, supabase, aoSalvar) {
    const modalDiv = document.createElement('div');
    modalDiv.className = 'modal';
    modalDiv.id = 'modal-edicao';
    modalDiv.style.display = 'flex';

    modalDiv.innerHTML = `
        <div class="card-modal">
            <div class="header-modal">
                <h2>Editar Aluno</h2>
            </div>
            <div class="body-modal">
                <div id="loading-edicao" style="text-align: center; padding: 20px;">
                    <i class="ri-loader-4-line ri-spin" style="font-size: 2rem;"></i>
                    <p>Buscando dados...</p>
                </div>
                <div id="conteudo-modal-edicao" style="display: none;">
                    <form id="form-editar-aluno" style="display: flex; flex-direction: column; gap: 12px;">
                        <div>
                            <label>Nome Completo:</label>
                            <input type="text" id="edit-nome" required style="width: 100%; padding: 8px;">
                        </div>
                        <div style="display: flex; gap: 10px;">
                            <div style="flex: 1;">
                                <label>Turma:</label>
                                <select id="edit-turma" style="width: 100%; padding: 8px;">
                                    <option value="Manhã">Manhã</option>
                                    <option value="Tarde">Tarde</option>
                                </select>
                            </div>
                            <div style="flex: 1;">
                                <label>Dia de Aula:</label>
                                <select id="edit-dia" style="width: 100%; padding: 8px;">
                                    <option value="Segunda/Terça">Segunda/Terça</option>
                                    <option value="Quarta/Quinta">Quarta/Quinta</option>
                                    <option value="Sexta">Sexta</option>
                                    <option value="Sábado">Sábado</option>
                                    <option value="Flexível">Flexível</option>
                                </select>
                            </div>
                        </div>
                        <div style="display: flex; gap: 10px;">
                            <div style="flex: 1;">
                                <label>Data de Término:</label>
                                <input type="date" id="edit-termino" required style="width: 100%; padding: 8px;">
                            </div>
                            <div style="flex: 1;">
                                <label>Status Certificado:</label>
                                <select id="edit-premium" style="width: 100%; padding: 8px;">
                                    <option value="No aguardo">No aguardo</option>
                                    <option value="Feito">Feito</option>
                                    <option value="Não quer fazer">Não quer fazer</option>
                                    <option value="Falha no Login">Falha no Login</option>
                                    <option value="Login Pronto">Login Pronto</option>
                                </select>
                            </div>
                        </div>

                        <div style="background: #f9f9f9; padding: 10px; border-radius: 5px; border: 1px solid #eee;">
                            <label style="font-weight: bold; color: #555;">Última Presença:</label>
                            <input type="date" id="edit-ultima-presenca" style="width: 100%; padding: 8px; margin-top: 5px;">
                            <small style="color: #888;">* Altera a data do registro mais recente.</small>
                        </div>

                        <div style="margin-top: 10px;">
                            <label>Observação:</label>
                            <textarea id="edit-obs" style="width: 100%; padding: 8px; height: 80px; resize: none;"></textarea>
                        </div>
                        <div class="footer-modal" style="margin-top: 15px; display: flex; justify-content: flex-end; gap: 10px;">
                            <button type="button" id="btn-cancelar-edit" style="background: #ccc; border: none; padding: 10px 15px; border-radius: 5px; cursor: pointer;">Cancelar</button>
                            <button type="submit" style="background: #007bff; color: white; border: none; padding: 10px 15px; border-radius: 5px; cursor: pointer;">Salvar Alterações</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modalDiv);

    // 1. Busca dados do aluno, observações e frequências
    const { data: aluno, error } = await supabase
        .from('alunos')
        .select('*, observacoes(*), frequencia(*)')
        .eq('id', alunoId)
        .single();

    if (error) {
        Swal.fire('Erro', "Erro ao buscar dados.", 'error');
        modalDiv.remove();
        return;
    }

    // Identifica a última observação e a última presença
    const obsExistente = aluno.observacoes?.sort((a, b) => b.id - a.id)[0] || null;
    const textoAtual = obsExistente ? obsExistente.texto_obs : "";
    
    const ultimaFreq = aluno.frequencia?.sort((a, b) => new Date(b.data_presenca) - new Date(a.data_presenca))[0] || null;
    const dataFreqAtual = ultimaFreq ? ultimaFreq.data_presenca : "";

    // 2. Preenche os campos
    const campos = {
        nome: document.getElementById('edit-nome'),
        turma: document.getElementById('edit-turma'),
        dia: document.getElementById('edit-dia'),
        termino: document.getElementById('edit-termino'),
        premium: document.getElementById('edit-premium'),
        obs: document.getElementById('edit-obs'),
        presenca: document.getElementById('edit-ultima-presenca')
    };

    campos.nome.value = aluno.nome;
    campos.turma.value = aluno.turma;
    campos.dia.value = aluno.dia_aula;
    campos.termino.value = aluno.data_termino;
    campos.premium.value = aluno.certificado_premium;
    campos.obs.value = textoAtual;
    campos.presenca.value = dataFreqAtual;

    document.getElementById('loading-edicao').style.display = 'none';
    document.getElementById('conteudo-modal-edicao').style.display = 'block';

    // 3. Lógica do botão Cancelar
    document.getElementById('btn-cancelar-edit').onclick = () => {
        const alterado = 
            campos.nome.value !== aluno.nome ||
            campos.turma.value !== aluno.turma ||
            campos.dia.value !== aluno.dia_aula ||
            campos.termino.value !== aluno.data_termino ||
            campos.premium.value !== aluno.certificado_premium ||
            campos.obs.value !== textoAtual ||
            campos.presenca.value !== dataFreqAtual;

        if (alterado) {
            Swal.fire({
                title: 'Descartar alterações?',
                text: "Você fez mudanças que serão perdidas.",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#d33',
                cancelButtonColor: '#3085d6',
                confirmButtonText: 'Sim, descartar',
                cancelButtonText: 'Voltar a editar'
            }).then((result) => {
                if (result.isConfirmed) modalDiv.remove();
            });
        } else {
            modalDiv.remove();
        }
    };

    // 4. Salvar Alterações
    document.getElementById('form-editar-aluno').onsubmit = async (e) => {
        e.preventDefault();

        // Bloquear botão ou mostrar loading se necessário
        const novosDados = {
            nome: campos.nome.value,
            turma: campos.turma.value,
            dia_aula: campos.dia.value,
            data_termino: campos.termino.value,
            certificado_premium: campos.premium.value
        };

        // Atualiza Dados do Aluno
        const { error: errA } = await supabase.from('alunos').update(novosDados).eq('id', alunoId);

        // Atualiza ou Insere Observação
        if (campos.obs.value !== textoAtual) {
            if (obsExistente) {
                await supabase.from('observacoes').update({ texto_obs: campos.obs.value }).eq('id', obsExistente.id);
            } else if (campos.obs.value.trim() !== "") {
                await supabase.from('observacoes').insert([{ aluno_id: alunoId, texto_obs: campos.obs.value }]);
            }
        }

        // Atualiza ou Insere Última Presença
        if (campos.presenca.value !== dataFreqAtual) {
            if (ultimaFreq) {
                // Se o campo for limpo, podemos deletar ou apenas ignorar (aqui vamos atualizar)
                if (campos.presenca.value) {
                    await supabase.from('frequencia').update({ data_presenca: campos.presenca.value }).eq('id', ultimaFreq.id);
                }
            } else if (campos.presenca.value) {
                // Se não tinha presença e agora tem, cria uma
                await supabase.from('frequencia').insert([{ aluno_id: alunoId, data_presenca: campos.presenca.value }]);
            }
        }

        if (errA) {
            Swal.fire('Erro', "Erro ao salvar.", 'error');
        } else {
            Swal.fire({ title: 'Salvo!', text: 'Dados atualizados com sucesso.', icon: 'success', timer: 1000, showConfirmButton: false });
            modalDiv.remove();
            aoSalvar();
        }
    };
}