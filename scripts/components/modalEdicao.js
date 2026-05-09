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
                        
                        <div>
                            <label>Horário de Estudo:</label>
                            <select id="edit-horario" style="width: 100%; padding: 8px;">
                                </select>
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

    // --- BUSCA DADOS DO ALUNO ---
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

    // --- ELEMENTOS E LÓGICA DINÂMICA DE HORÁRIO ---
    const campos = {
        nome: document.getElementById('edit-nome'),
        turma: document.getElementById('edit-turma'),
        dia: document.getElementById('edit-dia'),
        horario: document.getElementById('edit-horario'),
        termino: document.getElementById('edit-termino'),
        premium: document.getElementById('edit-premium'),
        obs: document.getElementById('edit-obs'),
        presenca: document.getElementById('edit-ultima-presenca')
    };

    function atualizarHorariosEdicao(valorParaSetar = null) {
        const turma = campos.turma.value;
        const dia = campos.dia.value;
        const eBloco2h = (dia === 'Sexta' || dia === 'Sábado');
        
        const horariosDef = {
            'Manhã': [
                { label: "08:00 - 09:00", bloco: 1 }, { label: "09:00 - 10:00", bloco: 1 },
                { label: "10:00 - 11:00", bloco: 1 }, { label: "11:00 - 12:00", bloco: 1 },
                { label: "08:00 - 10:00", bloco: 2 }, { label: "10:00 - 12:00", bloco: 2 }
            ],
            'Tarde': [
                { label: "14:00 - 15:00", bloco: 1 }, { label: "15:00 - 16:00", bloco: 1 },
                { label: "16:00 - 17:00", bloco: 1 }, { label: "17:00 - 18:00", bloco: 1 },
                { label: "14:00 - 16:00", bloco: 2 }, { label: "16:00 - 18:00", bloco: 2 }
            ]
        };

        // Salva o valor atual antes de limpar (caso o usuário mude só o dia/turma)
        const valorAtual = valorParaSetar || campos.horario.value;

        campos.horario.innerHTML = dia === 'Flexível' ? '<option value="Flexível">Flexível</option>' : '';
        
        if (dia !== 'Flexível') {
            horariosDef[turma].forEach(item => {
                if ((eBloco2h && item.bloco === 2) || (!eBloco2h && item.bloco === 1)) {
                    const opt = document.createElement('option');
                    opt.value = item.label;
                    opt.textContent = item.label;
                    campos.horario.appendChild(opt);
                }
            });
        }

        // Tenta re-selecionar o valor
        campos.horario.value = Array.from(campos.horario.options).some(o => o.value === valorAtual) 
            ? valorAtual 
            : campos.horario.options[0]?.value;
    }

    // Configura listeners para mudanças
    campos.turma.onchange = () => atualizarHorariosEdicao();
    campos.dia.onchange = () => atualizarHorariosEdicao();

    // --- PREENCHIMENTO DOS DADOS ---
    const obsExistente = aluno.observacoes?.sort((a, b) => b.id - a.id)[0] || null;
    const textoAtual = obsExistente ? obsExistente.texto_obs : "";
    const ultimaFreq = aluno.frequencia?.sort((a, b) => new Date(b.data_presenca) - new Date(a.data_presenca))[0] || null;
    const dataFreqAtual = ultimaFreq ? ultimaFreq.data_presenca : "";

    campos.nome.value = aluno.nome;
    campos.turma.value = aluno.turma;
    campos.dia.value = aluno.dia_aula;
    campos.termino.value = aluno.data_termino;
    campos.premium.value = aluno.certificado_premium;
    campos.obs.value = textoAtual;
    campos.presenca.value = dataFreqAtual;

    // Inicializa os horários passando o valor que veio do banco
    atualizarHorariosEdicao(aluno.horario_estudo || "Flexível");

    document.getElementById('loading-edicao').style.display = 'none';
    document.getElementById('conteudo-modal-edicao').style.display = 'block';

    // --- BOTÕES E SALVAMENTO ---
    document.getElementById('btn-cancelar-edit').onclick = () => {
        const alterado = 
            campos.nome.value !== aluno.nome ||
            campos.turma.value !== aluno.turma ||
            campos.dia.value !== aluno.dia_aula ||
            campos.horario.value !== (aluno.horario_estudo || "Flexível") ||
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
                confirmButtonText: 'Sim, descartar',
                cancelButtonText: 'Voltar'
            }).then((result) => { if (result.isConfirmed) modalDiv.remove(); });
        } else {
            modalDiv.remove();
        }
    };

    document.getElementById('form-editar-aluno').onsubmit = async (e) => {
        e.preventDefault();

        const novosDados = {
            nome: campos.nome.value,
            turma: campos.turma.value,
            dia_aula: campos.dia.value,
            horario_estudo: campos.horario.value,
            data_termino: campos.termino.value,
            certificado_premium: campos.premium.value
        };

        const { error: errA } = await supabase.from('alunos').update(novosDados).eq('id', alunoId);

        // Atualização de Obs e Presença (Mantido seu código original)
        if (campos.obs.value !== textoAtual) {
            if (obsExistente) {
                await supabase.from('observacoes').update({ texto_obs: campos.obs.value }).eq('id', obsExistente.id);
            } else if (campos.obs.value.trim() !== "") {
                await supabase.from('observacoes').insert([{ aluno_id: alunoId, texto_obs: campos.obs.value }]);
            }
        }

        if (campos.presenca.value !== dataFreqAtual) {
            if (ultimaFreq) {
                if (campos.presenca.value) {
                    await supabase.from('frequencia').update({ data_presenca: campos.presenca.value }).eq('id', ultimaFreq.id);
                }
            } else if (campos.presenca.value) {
                await supabase.from('frequencia').insert([{ aluno_id: alunoId, data_presenca: campos.presenca.value }]);
            }
        }

        if (errA) {
            Swal.fire('Erro', "Erro ao salvar.", 'error');
        } else {
            Swal.fire({ title: 'Salvo!', icon: 'success', timer: 1000, showConfirmButton: false });
            modalDiv.remove();
            aoSalvar();
        }
    };
}