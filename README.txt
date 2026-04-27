================================================================
  CASA DE EVENTOS — Sistema de Controle de Presença
  Documentação para o usuário final
================================================================

O QUE É O SISTEMA
-----------------
Plataforma web para gestão completa de eventos: cadastro de
convidados, importação de listas, controle de presença (check-in),
inscrições públicas via formulário/QR Code, dashboard em tempo
real e administração de usuários.

Funciona em qualquer navegador moderno (computador, tablet ou
celular) e sincroniza automaticamente entre todos os dispositivos
conectados.


================================================================
  1. ACESSO AO SISTEMA
================================================================

- O sistema exige login com e-mail e senha.
- Não há cadastro público: somente o administrador cria contas.
- O primeiro usuário criado vira automaticamente Administrador.
- Existem dois papéis (perfis):

  • Administrador — acesso total. Pode criar usuários, alterar
    branding (nome, logo, tema) e gerenciar tudo no sistema.

  • Operador — pode gerenciar eventos, convidados e fazer
    check-in. Não acessa o painel de Administração.


================================================================
  2. EVENTOS
================================================================

Página: /eventos

Permite:
- Criar, editar, finalizar, reabrir, cancelar e excluir eventos.
- Visualizar contagem de convidados, ingressos vendidos, presentes
  e pendentes para cada evento.
- Filtrar eventos por status (ativos / finalizados / cancelados).

Cada evento tem campos:
  Nome, descrição, data, horário, local e status.


================================================================
  3. PÁGINA DO EVENTO
================================================================

Acessível ao clicar em um evento na lista.

A página é organizada em ABAS:

  3.1) LISTA DE CONVIDADOS
  ------------------------
  - Tabela completa com nome, CPF, telefone, tipo de ingresso e
    presença (X de Y).
  - Ordenação: A→Z, Z→A, mais recentes, mais antigos.
  - Editar convidado (ícone de lápis).
  - Excluir convidado (com confirmação).
  - Exportar para CSV (compatível com Excel, com BOM UTF-8).

  3.2) INSCRIÇÕES (formulário público)
  ------------------------------------
  - Liga/desliga a inscrição pública para o evento.
  - Gera link público e QR Code prontos para compartilhar
    (WhatsApp, redes sociais, cartaz impresso).
  - Opção "Exigir aprovação do admin":
       Ativa  → inscrições entram como PENDENTES e precisam
                ser aprovadas aqui antes de virarem convidado.
       Desativa → inscrições entram direto na lista, prontas
                para check-in.
  - Lista de inscrições pendentes com botões "Aprovar" e
    "Rejeitar" individualmente, ou "Aprovar todas" de uma vez.

  3.3) IMPORTAR PLANILHA
  ----------------------
  - Aceita CSV e Excel (.xlsx).
  - Colunas reconhecidas: Nome, CPF, Telefone, Quantidade,
    Tipo, Observações.
  - Mostra pré-visualização e linhas com erro antes de
    confirmar a importação.
  - Botão para baixar planilha-modelo pronta para preencher.

  3.4) ADICIONAR MANUAL
  ---------------------
  - Cadastro rápido um por um.
  - Atalho de teclado: Shift + P abre direto o cadastro.

DASHBOARD DO EVENTO
-------------------
Página: /eventos/{id}/dashboard

- Cards: total de convidados, total de ingressos, presentes,
  pendentes, taxa de ocupação.
- Gráfico de check-ins por hora (linha do tempo).
- Distribuição por tipo de ingresso (pizza).
- Timeline ao vivo dos últimos check-ins.
- Ranking de operadores (quem fez mais check-ins).
- Exportar relatório completo em CSV.


================================================================
  4. CHECK-IN
================================================================

Página: /checkin

- Selecione o evento e busque o convidado pelo nome ou CPF.
- Botão grande para confirmar a presença em 1 toque.
- Filtros rápidos: TODOS / PRESENTES / PENDENTES.
- Botão de "corrigir check-in" para desfazer um check-in feito
  por engano.
- Tudo é sincronizado em tempo real entre dispositivos: vários
  funcionários podem fazer check-in ao mesmo tempo na portaria
  sem conflitos.


================================================================
  5. CONVIDADOS (visão geral)
================================================================

Página: /convidados

- Lista única com todos os convidados de todos os eventos.
- Busca global por nome / CPF.
- Útil para encontrar uma pessoa rapidamente sem saber o evento.


================================================================
  6. INSCRIÇÃO PÚBLICA (página do convidado)
================================================================

Página pública: /inscrever/{id-do-evento}

Quem recebe o link/QR enxerga:
- Nome, data, hora e local do evento.
- Formulário com nome, CPF, telefone, e-mail, tipo de ingresso,
  quantidade e observações.
- Mensagem de confirmação ao final, indicando se a inscrição já
  está confirmada ou se aguarda aprovação.

Não exige login. Ideal para divulgar lista VIP em redes sociais,
e-mails ou cartaz com QR Code.


================================================================
  7. ADMINISTRAÇÃO  (apenas perfil Administrador)
================================================================

Página: /admin

Funções:
- USUÁRIOS
    • Criar novos usuários (e-mail + senha).
    • Definir papel: Administrador ou Operador.
    • Excluir usuários.
- BRANDING
    • Editar o nome do sistema (ex.: trocar para o nome do
      cliente em cada casa de eventos).
    • Fazer upload do logo (aparece no menu lateral e no topo).
- TEMA
    Quatro temas pré-prontos para evitar conflitos visuais:
      • Midnight Indigo  (roxo/azul — padrão)
      • Noir & Gold      (preto e dourado, premium)
      • Ocean Deep       (azul corporativo)
      • Emerald Prestige (verde com dourado, elegante)


================================================================
  8. SINCRONIZAÇÃO EM TEMPO REAL
================================================================

Toda alteração feita em qualquer tela é refletida automaticamente
em todos os outros dispositivos conectados — sem precisar
atualizar a página. Funciona para:
  • Criação/edição de eventos
  • Cadastro/edição/remoção de convidados
  • Check-ins (entrada e correções)
  • Inscrições recebidas pelo formulário público


================================================================
  9. SEGURANÇA
================================================================

- Autenticação obrigatória (e-mail + senha).
- Permissões diferenciadas por papel (Admin x Operador).
- Inscrição pública é permitida apenas em eventos com a opção
  expressamente ativada pelo organizador.
- Convidados pendentes não podem fazer check-in até serem
  aprovados manualmente.
- Senhas armazenadas com hash seguro pela infraestrutura de
  autenticação (Lovable Cloud / Supabase Auth).


================================================================
  10. MAPA DE TELAS (rotas)
================================================================

  /                          Dashboard inicial
  /login                     Tela de login
  /eventos                   Lista de eventos
  /eventos/{id}              Página do evento (lista, inscrições,
                             importar, adicionar)
  /eventos/{id}/dashboard    Dashboard do evento (gráficos)
  /checkin                   Painel de check-in
  /convidados                Convidados (visão geral)
  /admin                     Painel de Administração (admin)
  /inscrever/{id}            Formulário público de inscrição


================================================================
  11. ATALHOS DE TECLADO
================================================================

  Shift + P   →  Abre o cadastro manual de convidado na página
                 do evento.


================================================================
  12. DICAS DE USO
================================================================

- Para um evento grande, distribua tablets/celulares na portaria;
  todos podem fazer check-in simultaneamente.
- Use a importação por planilha para listas grandes vindas de
  produtoras parceiras.
- Use o QR Code da inscrição pública em flyers, stories e
  e-mails para coletar a lista VIP de forma automatizada.
- Mantenha "Exigir aprovação" ligado quando a lista é restrita
  (ex.: convidados pessoais do anfitrião).
- Personalize o nome e o logo no painel Admin a cada novo cliente
  da casa de eventos.

================================================================
  Fim da documentação.
================================================================
