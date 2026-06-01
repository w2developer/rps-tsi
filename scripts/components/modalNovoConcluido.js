// components/modalNovoCadastro.js
export function abrirModalNovoConcluido(supabase, aoSalvar) {
    const modalDiv = document.createElement('div');
    modalDiv.className = 'modal';
    modalDiv.id = 'modal-cadastro';
    modalDiv.style.display = 'flex';

    modalDiv.innerHTML = `
        <div class="card-modal">
            <div class="header-modal">
                <h2>Cadastrar Novo Concluído</h2>
            </div>
            <div class="body-modal">
                <form id="form-cadastro-concluido" style="display: flex; flex-direction: column; gap: 15px;">
                    <div>
                        <label>Nome Completo:</label>
                        <input type="text" id="cad-nome" required style="width: 100%; padding: 8px;">
                    </div>
                    
                    <div style="display: flex; gap: 10px;">
                        <div style="flex: 1;">
                            <label>Usuário:</label>
                            <input type="text" id="cad-usuario" style="width: 100%; padding: 8px;">
                        </div>
                        <div style="flex: 1;">
                            <label>Curso Concluído:</label>
                            <input type="text" id="cad-curso" style="width: 100%; padding: 8px;">
                        </div>
                    </div>

                    <div style="display: flex; gap: 10px;">
                        <div style="flex: 1;">
                            <label>Turma:</label>
                            <select id="cad-turma" style="width: 100%; padding: 8px;">
                                <option value="Manhã">Manhã</option>
                                <option value="Tarde">Tarde</option>
                            </select>
                        </div>
                        <div style="flex: 1;">
                            <label>Dia da Aula:</label>
                            <select id="cad-dia" style="width: 100%; padding: 8px;">
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
                        <select id="cad-horario" style="width: 100%; padding: 8px;"></select>
                    </div>

                    <div style="display: flex; gap: 10px;">
                        <div style="flex: 1;">
                            <label>Data de Conclusão:</label>
                            <input type="date" id="cad-data" style="width: 100%; padding: 8px;">
                        </div>
                        <div style="flex: 1;">
                            <label>Status Certificado:</label>
                            <select id="cad-certificado" style="width: 100%; padding: 8px;">
                                <option value="">Nenhum (null)</option>
                                <option value="Pronto para Entregue">Pronto para Entregue</option>
                                <option value="Entregue">Entregue</option>
                            </select>
                        </div>
                    </div>

                    <div class="footer-modal" style="margin-top: 10px;">
                        <button type="button" id="btn-cancelar-cad" style="background: #ccc;">Cancelar</button>
                        <button type="submit" class="btn-presenca" style="background: #28a745; color: white;">Salvar Registro</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    document.body.appendChild(modalDiv);

    // --- LÓGICA DE HORÁRIOS ---
    const cadTurma = document.getElementById('cad-turma');
    const cadDia = document.getElementById('cad-dia');
    const cadHorario = document.getElementById('cad-horario');

    function atualizarHorariosCadastro() {
        const turma = cadTurma.value;
        const dia = cadDia.value;
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

        cadHorario.innerHTML = dia === 'Flexível' ? '<option value="Flexível">Flexível</option>' : '';
        
        if (dia !== 'Flexível') {
            horarios[turma].forEach(item => {
                if ((eBloco2h && item.bloco === 2) || (!eBloco2h && item.bloco === 1)) {
                    const opt = document.createElement('option');
                    opt.value = item.label;
                    opt.textContent = item.label;
                    cadHorario.appendChild(opt);
                }
            });
        }
    }

    cadTurma.onchange = atualizarHorariosCadastro;
    cadDia.onchange = atualizarHorariosCadastro;
    atualizarHorariosCadastro();

    // --- SALVAMENTO MANUAL ---
    document.getElementById('form-cadastro-concluido').onsubmit = async (e) => {
        e.preventDefault();
        
        const novoConcluido = {
            nome: document.getElementById('cad-nome').value,
            usuario: document.getElementById('cad-usuario').value || null,
            curso_concluido: document.getElementById('cad-curso').value || null,
            dia_aula: cadDia.value || null,
            horario_estudo: cadHorario.value || null,
            data_conclusao: document.getElementById('cad-data').value || null,
            certificado: document.getElementById('cad-certificado').value || null
        };

        const { error } = await supabase.from('concluidos').insert([novoConcluido]);
        if (error) return Swal.fire('Erro', error.message, 'error');

        Swal.fire({
            title: 'Cadastrado!',
            text: 'O registro foi salvo com sucesso.',
            icon: 'success',
            timer: 1500,
            showConfirmButton: false
        });
        
        modalDiv.remove();
        aoSalvar();
    };

    document.getElementById('btn-cancelar-cad').onclick = () => modalDiv.remove();
}