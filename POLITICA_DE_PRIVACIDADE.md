# Política de Privacidade do DarkOS

**Última atualização:** Outubro de 2026

A sua privacidade e a segurança do seu código-fonte são princípios fundamentais na arquitetura do **DarkOS**. Esta política descreve como os dados são tratados quando você utiliza a nossa IDE.

---

### 1. Princípio da Privacidade por Padrão (Local-First)
- O DarkOS foi concebido para que você tenha controle total sobre seu ambiente.
- O seu código-fonte, árvores de diretórios, variáveis de ambiente, histórico de terminal e arquivos locais **permanecem estritamente no seu computador**.
- Não realizamos telemetria invasiva ou coleta de dados pessoais do desenvolvedor. A telemetria corporativa padrão de terceiros foi completamente desabilitada.

### 2. Execução da Inteligência Artificial
- **Ambiente Local**: Quando você utiliza o DarkOS com o motor Ollama ou qualquer modelo local configurado, todo o processamento de linguagem natural ocorre na sua CPU / GPU / RAM. Nenhum dado transita pela internet durante o chat, autocompletar, testes automatizados ou checkpoints.
- **Provedores de Nuvem**: Se você optar por conectar um modelo de nuvem (OpenAI, Anthropic, Gemini, Groq, Ollama remoto), o DarkOS exibirá um aviso transparente informando que os dados sairão do computador para a respectiva API externa. Apenas os trechos de código necessários para responder ao prompt solicitado são enviados.

### 3. Checkpoints e Memória do Projeto
- Todos os marcos, diffs, snapshots do histórico, registros do Diário do Projeto e regras da Memória Local são armazenados em diretórios locais do projeto no seu próprio computador.
- Você tem a liberdade de exportar, modificar ou excluir esses dados a qualquer momento.

### 4. Telemetria e Atualizações
- O DarkOS apenas realiza consultas de versão aos endpoints públicos de release no GitHub (`DarkOS-versions` e `DarkOS-binaries`) para checar se existem atualizações disponíveis.
- Essas consultas não enviam identificadores pessoais ou dados de uso.

### 5. Dúvidas sobre Privacidade e Contato
Se tiver qualquer dúvida ou preocupação sobre a privacidade dos seus dados ao utilizar o DarkOS, entre em contato diretamente com nossa equipe:
- **E-mail Oficial:** pedro2rafael4561@gmail.com
- **GitHub:** [https://github.com/pedro2rafael4561-boop/DarkOS](https://github.com/pedro2rafael4561-boop/DarkOS)
