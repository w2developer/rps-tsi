// components/modalEdicao.js

export async function abrirModalEdicao(alunoId, supabase, aoSalvar) {
    const modalDiv = document.createElement('div');
    modalDiv.className = 'modal';
    modalDiv.id = 'modal-edicao';
    modalDiv.style.display = 'flex';

    modalDiv.innerHTML = `
        <div class="card-modal">
            <div class="header-modal"><h2>Editar Aluno</h2></div>
            <div class="body-modal">
                <div id="loading-edicao" style="text-align: center; padding: 20px;">
                    <i class="ri-loader-4-line ri-spin" style="font-size: 2rem;"></i>
                </div>
                <div id="conteudo-modal-edicao" style="display: none;">
                    <form id="form-editar-aluno" style="display: flex; flex-direction: column; gap: 12px;">
                        <div>
                            <label>Nome Completo:</label>
                            <input type="text" id="edit-nome" required style="width: 100%; padding: 8px;">
                        </div>
                        <div style="display: flex; gap: 10px;">
                            <div style="flex: 1;">
                                <label>Data de Nascimento:</label>
                                <input type="date" id="edit-nascimento" style="width: 100%; padding: 8px;">
                            </div>
                            <div style="flex: 1;">
                                <label>Código de Acesso:</label>
                                <input type="text" id="edit-codigo" style="width: 100%; padding: 8px;">
                            </div>
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
                            <select id="edit-horario" style="width: 100%; padding: 8px;"></select>
                        </div>
                        <div>
                            <label>Data de Término:</label>
                            <input type="date" id="edit-termino" required style="width: 100%; padding: 8px;">
                        </div>
                        <div class="footer-modal" style="margin-top: 15px; display: flex; justify-content: flex-end; gap: 10px;">
                            <button type="button" id="btn-cancelar-edit" style="background: #ccc;">Cancelar</button>
                            <button type="submit" style="background: #007bff; color: white;">Salvar</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modalDiv);

    // 1. Busca dados do aluno, frequencia e vinculo de usuario
    const { data: aluno, error } = await supabase
        .from('alunos')
        .select('*, frequencia(*), usuarios_aluno(*)')
        .eq('id', alunoId)
        .single();

    if (error) { modalDiv.remove(); return Swal.fire('Erro', "Erro ao buscar.", 'error'); }

    // 2. Mapeamento de campos
    const campos = {
        nome: document.getElementById('edit-nome'),
        nascimento: document.getElementById('edit-nascimento'),
        codigo: document.getElementById('edit-codigo'),
        turma: document.getElementById('edit-turma'),
        dia: document.getElementById('edit-dia'),
        horario: document.getElementById('edit-horario'),
        termino: document.getElementById('edit-termino')
    };

    // 3. Preenchimento inicial
    campos.nome.value = aluno.nome;
    campos.nascimento.value = aluno.data_nascimento || '';
    campos.codigo.value = aluno.usuarios_aluno?.[0]?.codigo || '';
    campos.turma.value = aluno.turma;
    campos.dia.value = aluno.dia_aula;
    campos.termino.value = aluno.data_termino;

    // 4. Lógica de horários (a mesma que você já tem)
    function carregarHorarios(selecionado) {
        const horarios = {
            'Manhã': ["08:00 - 09:00", "09:00 - 10:00", "10:00 - 11:00", "11:00 - 12:00"],
            'Tarde': ["14:00 - 15:00", "15:00 - 16:00", "16:00 - 17:00", "17:00 - 18:00"]
        };
        campos.horario.innerHTML = '';
        horarios[campos.turma.value].forEach(h => {
            const opt = document.createElement('option');
            opt.value = h; opt.textContent = h;
            if (h === selecionado) opt.selected = true;
            campos.horario.appendChild(opt);
        });
    }
    campos.turma.onchange = () => carregarHorarios();
    carregarHorarios(aluno.horario_estudo);

    document.getElementById('loading-edicao').style.display = 'none';
    document.getElementById('conteudo-modal-edicao').style.display = 'block';

    // 5. Salvamento
    document.getElementById('form-editar-aluno').onsubmit = async (e) => {
        e.preventDefault();

        // Update na tabela alunos
        await supabase.from('alunos').update({
            nome: campos.nome.value,
            data_nascimento: campos.nascimento.value,
            turma: campos.turma.value,
            dia_aula: campos.dia.value,
            horario_estudo: campos.horario.value,
            data_termino: campos.termino.value
        }).eq('id', alunoId);

        // Update/Insert na tabela usuarios_aluno
        const ano = campos.nascimento.value.split('-')[0];
        if (campos.codigo.value) {
            const payload = { aluno_id: alunoId, codigo: campos.codigo.value, senha: ano };
            if (aluno.usuarios_aluno?.length > 0) {
                await supabase.from('usuarios_aluno').update(payload).eq('aluno_id', alunoId);
            } else {
                await supabase.from('usuarios_aluno').insert([payload]);
            }
        }

        Swal.fire('Sucesso!', 'Dados atualizados.', 'success');
        modalDiv.remove();
        aoSalvar();
    };

    document.getElementById('btn-cancelar-edit').onclick = () => modalDiv.remove();
}