# Checklist de Lançamento e Publicação Oficial - DarkOS

Este documento consolida a revisão final, orientações jurídicas, canais de suporte e o guia técnico sobre assinatura digital de executáveis.

---

## 1. Guia Explicativo: Assinatura de Código (Code Signing)

### O que é Assinatura de Código?
Quando você compila um arquivo executável (`.exe`) no Windows ou instalador InnoSetup sem uma assinatura digital, o Windows não reconhece o desenvolvedor como confiável. Ao tentar abrir o arquivo, o sistema operacional exibe a tela azul:
> *"O Windows protegeu o seu computador (Windows SmartScreen impediu a inicialização de um aplicativo não reconhecido)"*.

A **Assinatura de Código** é um certificado digital criptográfico (semelhante ao HTTPS da web) emitido por uma Autoridade Certificadora (CA) reconhecida que atesta:
1. **Autoria Verificada:** Garante aos usuários e ao Windows que o instalador foi realmente produzido por você / DarkOS.
2. **Integridade Garantida:** Prova que o instalador não foi adulterado por malwares ou terceiros após a compilação.
3. **Reputação Instantânea:** Elimina o aviso preventivo do Windows SmartScreen.

### O que você precisa providenciar para assinar o DarkOS:
1. **Certificado de Assinatura de Código:**
   - **Opção Individual (OV - Organization / Individual Validation):** Emitido para pessoa física ou jurídica (ex: Sectigo, SSL.com, DigiCert). Custo aproximado de ~$150-$250/ano.
   - **Opção Nuvem Moderna (Recomendada para GitHub Actions):**
     - **Azure Trusted Signing (Microsoft):** Serviço em nuvem de assinatura de binários da Microsoft integrado diretamente ao GitHub Actions sem necessidade de tokens físicos (tokens HSM USB).
     - **SignPath.io:** Gratuito para projetos de código aberto aprovados.
2. **Integração no GitHub Actions:**
   - Quando você adquirir o certificado ou configurar o Azure Trusted Signing, adicionamos uma etapa simples no script `DarkOS-builder/build.sh` utilizando o utilitário `signtool.exe` do Windows SDK para assinar os binários antes de publicá-los nas releases do `DarkOS-binaries`.
   - *Nota:* Sem a assinatura, os usuários ainda conseguem instalar o DarkOS normalmente clicando em *"Mais informações" -> "Executar assim mesmo"*.

---

## 2. Checklist Pré-Publicação

- [x] **Identidade Visual e Logotipos**: Todos os logotipos 3D cristal, ícones do aplicativo, favicon, banners e instalador atualizados para DarkOS.
- [x] **Suporte a Idioma pt-BR**: Interface e notificações em Português do Brasil.
- [x] **Preparação da IA (Onboarding)**: Detecção de hardware, escolha de modelo adaptativo e integração com Ollama.
- [x] **Terminal Inteligente**: Tradução em linguagem natural com filtro heurístico de segurança.
- [x] **Sistema de Checkpoints**: Snapshots granulares, histórico, tags e reversão modular por arquivo.
- [x] **Testador Automático & Botão SOS**: Testes de cliques, formulários e responsividade com botão de resgate instantâneo.
- [x] **Preview em Tempo Real Multi-Telas**: Alternância Celular, Tablet, Desktop, Smart TV e espaço preparado para Emulador Android.
- [x] **Diário, Mapa e Memória do Projeto**: Registro profissional cronológico, grafo interativo de nós e editor visual de regras locais.
- [x] **Documentos Legais**:
  - [x] `TERMOS_DE_USO.md`
  - [x] `POLITICA_DE_PRIVACIDADE.md`
- [x] **Canais Oficiais de Contato**:
  - E-mail: pedro2rafael4561@gmail.com
  - Repositório: https://github.com/pedro2rafael4561-boop/DarkOS
- [x] **Fluxo de CI/CD Windows**: GitHub Actions compilando e gerando releases em `DarkOS-binaries` com versionamento em `DarkOS-versions`.

---

## 3. Validação em Computador Limpo (Instalador & Atualização)

1. **Instalação Inicial (v0.0.1):**
   - Baixar o executável gerado `DarkOSSetup-x64-0.0.1.exe` na página de releases do `DarkOS-binaries`.
   - Executar o instalador. Verificar atalho na Área de Trabalho e Menu Iniciar com o novo ícone 3D DarkOS.
   - Na primeira inicialização, verificar abertura da tela de boas-vindas "Preparando sua IA".

2. **Fluxo de Atualização Silenciosa (v0.0.2):**
   - Quando uma nova versão for publicada no GitHub Actions, o arquivo `version.json` em `DarkOS-versions` é atualizado.
   - O DarkOS detecta a nova versão em segundo plano, exibe a notificação em português e aplica a atualização ao reiniciar.
