// components/modalCadastro.js

export function abrirModalCadastro(supabase, aoSalvar) {
    const modalDiv = document.createElement('div');
    modalDiv.className = 'modal';
    modalDiv.id = 'modal-cadastro';
    modalDiv.style.display = 'flex';

    modalDiv.innerHTML = `
        <div class="card-modal">
            <div class="header-modal">
                <h2>Cadastrar Novo Aluno</h2>
            </div>
            <div class="body-modal">
                <form id="form-cadastro-aluno" style="display: flex; flex-direction: column; gap: 15px;">
                    <div>
                        <label>Nome Completo:</label>
                        <input type="text" id="cad-nome" required style="width: 100%; padding: 8px;">
                    </div>
                    
                    <div>
                        <label>Data de Nascimento:</label>
                        <input type="date" id="cad-nascimento" required style="width: 100%; padding: 8px;">
                    </div>

                    <div>
                        <label>Código de Acesso:</label>
                        <input type="text" id="cad-codigo" required style="width: 100%; padding: 8px;">
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
                            <label>Dia de Aula:</label>
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

                    <div>
                        <label>Data de Término:</label>
                        <input type="date" id="cad-termino" required style="width: 100%; padding: 8px;">
                    </div>

                    <div class="footer-modal" style="margin-top: 10px;">
                        <button type="button" id="btn-cancelar-cad" style="background: #ccc;">Cancelar</button>
                        <button type="submit" class="btn-presenca" style="background: #28a745; color: white;">Salvar Aluno</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    document.body.appendChild(modalDiv);

    // Lógica de horários (mantida conforme original)
    const cadTurma = document.getElementById('cad-turma');
    const cadDia = document.getElementById('cad-dia');
    const cadHorario = document.getElementById('cad-horario');

    function atualizarHorariosCadastro() {
        const turma = cadTurma.value;
        const dia = cadDia.value;
        const eBloco2h = (dia === 'Sexta' || dia === 'Sábado');
        const horarios = {
            'Manhã': [{ label: "08:00 - 12:00", bloco: 2 }, { label: "08:00 - 09:00", bloco: 1 }],
            'Tarde': [{ label: "14:00 - 18:00", bloco: 2 }, { label: "14:00 - 15:00", bloco: 1 }]
        };
        cadHorario.innerHTML = '';
        horarios[turma].forEach(item => {
            const opt = document.createElement('option');
            opt.value = item.label;
            opt.textContent = item.label;
            cadHorario.appendChild(opt);
        });
    }
    cadTurma.onchange = cadDia.onchange = atualizarHorariosCadastro;
    atualizarHorariosCadastro();

    // Salvamento com criação do usuário
    document.getElementById('form-cadastro-aluno').onsubmit = async (e) => {
        e.preventDefault();
        
        const dataNasc = document.getElementById('cad-nascimento').value;
        const anoNasc = dataNasc.split('-')[0]; // Extrai o ano

        const novoAluno = {
            nome: document.getElementById('cad-nome').value,
            data_nascimento: dataNasc,
            turma: cadTurma.value,
            dia_aula: cadDia.value,
            horario_estudo: cadHorario.value,
            data_termino: document.getElementById('cad-termino').value
        };

        // 1. Insere aluno
        const { data: aluno, error: errAluno } = await supabase.from('alunos').insert([novoAluno]).select();
        
        if (errAluno) return Swal.fire('Erro', errAluno.message, 'error');

        // 2. Insere usuário associado
        const { error: errUser } = await supabase.from('usuarios_aluno').insert([{
            aluno_id: aluno[0].id,
            codigo: document.getElementById('cad-codigo').value,
            senha: anoNasc
        }]);

        if (errUser) return Swal.fire('Erro', 'Aluno salvo, mas erro ao criar usuário: ' + errUser.message, 'error');

        Swal.fire('Sucesso!', 'Aluno e acesso criados.', 'success');
        modalDiv.remove();
        aoSalvar();
    };

    document.getElementById('btn-cancelar-cad').onclick = () => modalDiv.remove();
}