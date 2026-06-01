export async function abrirModalEdicaoConcluido(id, supabase, aoSalvar) {
    const modalDiv = document.createElement('div');
    modalDiv.className = 'modal';
    modalDiv.id = 'modal-edicao';
    modalDiv.style.display = 'flex';

    modalDiv.innerHTML = `
        <div class="card-modal">
            <div class="header-modal">
                <h2>Editar Aluno Concluído</h2>
            </div>
            <div class="body-modal">
                <div id="loading-edicao" style="text-align: center; padding: 20px;">
                    <i class="ri-loader-4-line ri-spin" style="font-size: 2rem;"></i>
                    <p>Buscando dados...</p>
                </div>
                <div id="conteudo-modal-edicao" style="display: none;">
                    <form id="form-editar-concluido" style="display: flex; flex-direction: column; gap: 12px;">
                        <div>
                            <label>Nome Completo:</label>
                            <input type="text" id="edit-nome" required style="width: 100%; padding: 8px;">
                        </div>

                        <div style="display: flex; gap: 10px;">
                            <div style="flex: 1;">
                                <label>Curso Concluído:</label>
                                <input type="text" id="edit-curso" style="width: 100%; padding: 8px;">
                            </div>
                            <div style="flex: 1;">
                                <label>Turma:</label>
                                <select id="edit-turma" style="width: 100%; padding: 8px;">
                                    <option value="Manhã">Manhã</option>
                                    <option value="Tarde">Tarde</option>
                                </select>
                            </div>
                        </div>

                        <div style="display: flex; gap: 10px;">
                            <div style="flex: 1;">
                                <label>Dia da Aula:</label>
                                <select id="edit-dia" style="width: 100%; padding: 8px;">
                                    <option value="Segunda/Terça">Segunda/Terça</option>
                                    <option value="Quarta/Quinta">Quarta/Quinta</option>
                                    <option value="Sexta">Sexta</option>
                                    <option value="Sábado">Sábado</option>
                                    <option value="Flexível">Flexível</option>
                                </select>
                            </div>
                            <div style="flex: 1;">
                                <label>Horário de Estudo:</label>
                                <select id="edit-horario" style="width: 100%; padding: 8px;"></select>
                            </div>
                        </div>

                        <div style="display: flex; gap: 10px;">
                            <div style="flex: 1;">
                                <label>Data de Conclusão:</label>
                                <input type="date" id="edit-data" style="width: 100%; padding: 8px;">
                            </div>
                            <div style="flex: 1;">
                                <label>Status Certificado:</label>
                                <select id="edit-certificado" style="width: 100%; padding: 8px;">
                                    <option value="">Nenhum (null)</option>
                                    <option value="Pronto para Entregue">Pronto para Entregue</option>
                                    <option value="Entregue">Entregue</option>
                                </select>
                            </div>
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

    // --- LÓGICA DE HORÁRIOS ---
    const editTurma = document.getElementById('edit-turma');
    const editDia = document.getElementById('edit-dia');
    const editHorario = document.getElementById('edit-horario');

    function atualizarHorariosEdicao() {
        const turma = editTurma.value;
        const dia = editDia.value;
        const eBloco2h = (dia === 'Sexta' || dia === 'Sábado');
        
        const horarios = {
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

        editHorario.innerHTML = dia === 'Flexível' ? '<option value="Flexível">Flexível</option>' : '';
        
        if (dia !== 'Flexível') {
            horarios[turma].forEach(item => {
                if ((eBloco2h && item.bloco === 2) || (!eBloco2h && item.bloco === 1)) {
                    const opt = document.createElement('option');
                    opt.value = item.label;
                    opt.textContent = item.label;
                    editHorario.appendChild(opt);
                }
            });
        }
    }

    editTurma.onchange = atualizarHorariosEdicao;
    editDia.onchange = atualizarHorariosEdicao;

    // --- BUSCA DADOS DO CONCLUÍDO ---
    const { data: concluido, error } = await supabase
        .from('concluidos')
        .select('*')
        .eq('id', id)
        .single();

    if (error) {
        Swal.fire('Erro', "Erro ao buscar dados.", 'error');
        modalDiv.remove();
        return;
    }

    // --- MAPEAMENTO DOS CAMPOS ---
    const campos = {
        nome: document.getElementById('edit-nome'),
        curso: document.getElementById('edit-curso'),
        turma: editTurma,
        dia: editDia,
        horario: editHorario,
        data: document.getElementById('edit-data'),
        certificado: document.getElementById('edit-certificado')
    };

    // --- PREENCHIMENTO DOS DADOS ---
    campos.nome.value = concluido.nome || "";
    campos.curso.value = concluido.curso_concluido || "";
    campos.dia.value = concluido.dia_aula || "Segunda/Terça";

    // Detecta se o horário salvo pertence ao período matutino ou vespertino
    const hSalvo = concluido.horario_estudo || "";
    if (hSalvo.startsWith("14") || hSalvo.startsWith("15") || hSalvo.startsWith("16") || hSalvo.startsWith("17")) {
        campos.turma.value = "Tarde";
    } else {
        campos.turma.value = "Manhã";
    }

    // Atualiza a árvore do DOM dos horários antes de injetar o valor salvo
    atualizarHorariosEdicao();
    campos.horario.value = hSalvo;
    
    campos.data.value = concluido.data_conclusao || "";
    campos.certificado.value = concluido.certificado || "";

    document.getElementById('loading-edicao').style.display = 'none';
    document.getElementById('conteudo-modal-edicao').style.display = 'block';

    // --- DESCARTE DE ALTERAÇÕES ---
    document.getElementById('btn-cancelar-edit').onclick = () => {
        const alterado = 
            campos.nome.value !== (concluido.nome || "") ||
            campos.curso.value !== (concluido.curso_concluido || "") ||
            campos.dia.value !== (concluido.dia_aula || "") ||
            campos.horario.value !== (concluido.horario_estudo || "") ||
            campos.data.value !== (concluido.data_conclusao || "") ||
            campos.certificado.value !== (concluido.certificado || "");

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

    // --- SALVAMENTO ---
    document.getElementById('form-editar-concluido').onsubmit = async (e) => {
        e.preventDefault();

        const novosDados = {
            nome: campos.nome.value,
            curso_concluido: campos.curso.value || null,
            dia_aula: campos.dia.value || null,
            horario_estudo: campos.horario.value || null,
            data_conclusao: campos.data.value || null,
            certificado: campos.certificado.value || null
        };

        const { error: errU } = await supabase.from('concluidos').update(novosDados).eq('id', id);
        if (errU) return Swal.fire('Erro', "Erro ao salvar dados.", 'error');

        Swal.fire({ title: 'Salvo!', icon: 'success', timer: 1000, showConfirmButton: false });
        modalDiv.remove();
        aoSalvar();
    };
}