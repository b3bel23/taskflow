# TaskFlow

Um gerenciador semanal de tarefas simples e intuitivo, desenvolvido com **React** e **TypeScript**, seguindo o **BMAD Method** e **Spec-Driven Development (SDD)** desde a descoberta do problema até a implementação.

> 🚧 **Status do projeto:** Em desenvolvimento — sendo implementado história por história de acordo com as especificações previamente definidas e validadas.

## 📌 Sobre o projeto

O TaskFlow surgiu para resolver um problema simples: tarefas relacionadas a trabalho, estudos e vida pessoal frequentemente acabam espalhadas entre anotações, mensagens e diferentes aplicativos.

O objetivo é oferecer uma **visão semanal simples e centralizada**, permitindo organizar tarefas por dia, prioridade e estado de progresso sem a complexidade de ferramentas tradicionais de gerenciamento de projetos.

Além de ser uma aplicação funcional, o projeto também serve como estudo prático de desenvolvimento de software assistido por IA utilizando **BMAD Method + Spec-Driven Development**.

Em vez de gerar a aplicação diretamente a partir de um prompt, o projeto passou por um processo completo de planejamento, especificação, UX e arquitetura antes do início da implementação.

## ✨ Funcionalidades do MVP

* 📅 Visualização semanal de segunda a domingo
* ➕ Criação de tarefas vinculadas a um dia
* ✏️ Edição de tarefas
* 🗑️ Exclusão com confirmação
* 🚦 Três estados de progresso:

  * Pendente
  * Em andamento
  * Concluída
* 🔴 Prioridade Alta
* 🟠 Prioridade Média
* 🟢 Prioridade Baixa
* ↕️ Ordenação manual de tarefas
* 🖱️ Drag and Drop entre dias e prioridades
* 💾 Persistência local utilizando `localStorage`
* 🌙 Tema claro e escuro
* ♿ Interações acessíveis por teclado

O MVP não possui cadastro ou login e funciona totalmente no navegador.

## 🧠 Processo de desenvolvimento

O TaskFlow segue um processo estruturado combinando **BMAD Method** e **Spec-Driven Development (SDD)**.

A implementação não começou imediatamente. Primeiro foram definidos e validados o problema, requisitos, experiência do usuário, arquitetura e especificações.

O fluxo seguido foi:

```text
Product Brief
     ↓
PRD
     ↓
UX Design
     ↓
Arquitetura
     ↓
SPEC
     ↓
Épicos e Histórias
     ↓
Sprint Planning
     ↓
Implementação
```

A implementação é realizada **história por história**, validando os critérios de aceite antes de avançar para a próxima etapa.

## 📋 Planejamento

O MVP foi dividido em **4 épicos e 10 histórias de usuário**.

### Epic 1 — Fundação

Estrutura inicial da aplicação, visão semanal vazia, infraestrutura de persistência e suporte aos temas claro e escuro.

### Epic 2 — Gerenciamento de Tarefas

Criação, edição e exclusão de tarefas.

### Epic 3 — Progresso do Dia

Acompanhamento do estado das tarefas e diferenciação visual de tarefas concluídas.

### Epic 4 — Drag and Drop

Reorganização manual das tarefas e movimentação entre dias e níveis de prioridade.

## 🛠️ Tecnologias

* React 19
* TypeScript
* Vite
* CSS Custom Properties
* React Context
* `useReducer`
* `localStorage`
* `@dnd-kit/react`
* Vitest
* Testing Library

O MVP foi projetado para funcionar **100% client-side**, sem necessidade de backend.

## 🏗️ Arquitetura

A arquitetura do TaskFlow foi mantida propositalmente simples e proporcional ao escopo do MVP.

As tarefas e a preferência de tema são persistidas separadamente no navegador:

```text
taskflow:tasks
taskflow:theme
```

As alterações de estado passam por ações centralizadas, mantendo os componentes da interface separados da lógica de persistência.

A arquitetura evita dependências desnecessárias para o escopo atual, como Redux, banco de dados externo, serviços de autenticação ou uma API backend.

## 🧪 Testes

Cada história implementada é validada individualmente contra seus critérios de aceite.

O projeto utiliza:

* **Vitest** para testes automatizados
* **Testing Library** para testes de componentes e interações
* TypeScript para verificação de tipos
* Validação do build
* Verificação dos critérios de aceite de cada história antes de avançar

## 🚀 Executando o projeto localmente

Clone o repositório:

```bash
git clone https://github.com/b3bel23/taskflow.git
```

Entre na pasta:

```bash
cd taskflow
```

Instale as dependências:

```bash
npm install
```

Inicie o servidor de desenvolvimento:

```bash
npm run dev
```

Execute os testes:

```bash
npm run test
```

Valide o build:

```bash
npm run build
```

## 📊 Progresso atual

* [x] Product Brief
* [x] PRD
* [x] UX Design
* [x] Arquitetura
* [x] SPEC
* [x] Épicos e Histórias de Usuário
* [x] Sprint Planning / Readiness Gate
* [x] Story 1.1 — Visualizar a Semana Vazia
* [ ] Story 1.2 — Persistência das Tarefas
* [ ] Story 1.3 — Tema Claro/Escuro
* [ ] Epic 2 — Gerenciamento de Tarefas
* [ ] Epic 3 — Progresso do Dia
* [ ] Epic 4 — Drag and Drop

## 🎯 Objetivos do projeto

O TaskFlow possui dois objetivos principais.

**Objetivo de produto:** desenvolver um gerenciador de tarefas funcional que possa ser utilizado em uma rotina semanal real.

**Objetivo de aprendizado:** experimentar um fluxo completo de desenvolvimento de software assistido por IA, mantendo requisitos, UX, arquitetura, especificações, implementação e testes explicitamente documentados.

## 🔮 Possibilidades futuras

Algumas funcionalidades foram propositalmente deixadas fora do MVP:

* Cadastro e login
* Sincronização entre dispositivos
* Experiência otimizada para dispositivos móveis
* Notificações e lembretes

Mesmo em versões futuras, a proposta do TaskFlow é permanecer focada em **organização pessoal**, e não se transformar em uma ferramenta de gerenciamento de equipes.

---

Desenvolvido como um projeto prático utilizando **BMAD Method + Spec-Driven Development (SDD)**.
