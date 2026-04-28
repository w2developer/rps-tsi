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
                <div style="background: #f4f4f4; padding: 10px; border-radius: 5px; margin-bottom: 20px;">
                    <label style="font-weight: bold; display: block; margin-bottom: 5px;">Importar via JSON:</label>
                    <input type="file" id="import-json" accept=".json" style="font-size: 0.8rem;">
                    <p style="font-size: 0.7rem; color: #666; margin-top: 5px;">* O arquivo deve ser um array de objetos.</p>
                </div>

                <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">

                <form id="form-cadastro-aluno" style="display: flex; flex-direction: column; gap: 15px;">
                    <div>
                        <label>Nome Completo:</label>
                        <input type="text" id="cad-nome" required style="width: 100%; padding: 8px;">
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

    // --- LÓGICA DE IMPORTAÇÃO JSON ---
    document.getElementById('import-json').onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const listaAlunos = JSON.parse(event.target.result);
                if (!Array.isArray(listaAlunos)) throw new Error("O JSON deve ser uma lista []");

                const { error } = await supabase.from('alunos').insert(listaAlunos);
                if (error) throw error;

                Swal.fire({
                    title: 'Sucesso!',
                    text: `${listaAlunos.length} alunos importados.`,
                    icon: 'success',
                    timer: 2000,
                    showConfirmButton: false
                });
                
                modalDiv.remove();
                aoSalvar();
            } catch (err) {
                Swal.fire('Erro', "Falha ao importar JSON: " + err.message, 'error');
                e.target.value = ''; 
            }
        };
        reader.readAsText(file);
    };

    // --- SALVAMENTO MANUAL ---
    document.getElementById('form-cadastro-aluno').onsubmit = async (e) => {
        e.preventDefault();
        
        const novoAluno = {
            nome: document.getElementById('cad-nome').value,
            turma: document.getElementById('cad-turma').value,
            dia_aula: document.getElementById('cad-dia').value,
            data_termino: document.getElementById('cad-termino').value
        };

        const { error } = await supabase.from('alunos').insert([novoAluno]);

        if (error) {
            Swal.fire('Erro', "Erro ao cadastrar: " + error.message, 'error');
        } else {
            // Alerta de confirmação antes de fechar
            Swal.fire({
                title: 'Cadastrado!',
                text: 'O aluno foi salvo com sucesso.',
                icon: 'success',
                timer: 1500,
                showConfirmButton: false
            });
            
            modalDiv.remove();
            aoSalvar();
        }
    };

    document.getElementById('btn-cancelar-cad').onclick = () => modalDiv.remove();
}