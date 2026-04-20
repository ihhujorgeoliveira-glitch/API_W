# Documentação da Rotina Plusoft - Produtos e Lotes

## 📋 Resumo Executivo

Esta documentação descreve o sistema de sincronização de **Produtos** e **Lotes** entre os bancos de dados **JDE (J.D. Edwards)** e **EAI (Enterprise Application Integration)** da Biolab Sanus Farmacêutica. O sistema foi desenvolvido em C# (.NET) e utiliza padrões de programação assíncrona com Tasks para otimizar o desempenho.

---

## 📌 Índice

1. [Estrutura de Dados](#estrutura-de-dados)
2. [Fluxo Geral do Processo](#fluxo-geral-do-processo)
3. [Classes Principais](#classes-principais)
4. [Métodos Principais](#métodos-principais)
5. [Tabelas do Banco de Dados](#tabelas-do-banco-de-dados)
6. [Processo de Sincronização](#processo-de-sincronização)
7. [Tratamento de Erros](#tratamento-de-erros)
8. [Exemplos de Uso](#exemplos-de-uso)

---

## 1️⃣ Estrutura de Dados

### 1.1 Model_JDEProdutos
Representa um **Produto** do sistema JDE com todos os seus atributos mestres.

```csharp
public class Model_JDEProdutos
{
    public string itm_codigointerno          { get; set; }  // Código interno do item
    public string itm_codigosecundario       { get; set; }  // Código secundário/EAN
    public string itm_descricao              { get; set; }  // Descrição principal
    public string itm_descricao2             { get; set; }  // Descrição secundária
    public string itm_ean                    { get; set; }  // Código EAN/Barras
    public string itm_grupodescricao         { get; set; }  // Descrição do Grupo
    public string itm_subgrupo               { get; set; }  // Subgrupo do produto
    public string itm_marcadescricao         { get; set; }  // Marca do produto
    public string itm_unidadedemedida        { get; set; }  // UM (Unidade de Medida)
    public string itm_linha                  { get; set; }  // Linha comercial
    public string itm_classe                 { get; set; }  // Classe do item
    public string itm_divisao                { get; set; }  // Divisão organizacional
    public string itm_tipo                   { get; set; }  // Tipo de produto
    public string itm_categoria              { get; set; }  // Categoria
    public string itm_linhaneg               { get; set; }  // Linha de negócio
    public string itm_grupo                  { get; set; }  // Grupo classificatório
    public string dataultimaalteracao        { get; set; }  // Data da última alteração
    public string horaultimaalteracao        { get; set; }  // Hora da última alteração
    public string acao                       { get; set; }  // Ação (INSERT/UPDATE/NONE)
    public DateTime IntegrationDate          { get; set; }  // Data de integração
}
```

**Campos Chave:**
- `itm_codigointerno + itm_codigosecundario` = Chave primária única do produto

---

### 1.2 Model_JDELotes
Representa um **Lote/Série** de um produto com informações de validade e fabricação.

```csharp
public class Model_JDELotes
{
    public string luf_numeroloteserie        { get; set; }  // Número/Série do lote
    public string itm_codigointerno          { get; set; }  // Código interno do item
    public string itm_codigoItem             { get; set; }  // Código do item
    public string itm_codigosecundario       { get; set; }  // Código secundário
    public string itm_descricao              { get; set; }  // Descrição do item
    public string luf_datavencimento_jde     { get; set; }  // Data vencimento (formato JDE)
    public string luf_datavalidade_jde       { get; set; }  // Data validade (formato JDE)
    public string luf_datafabricacao_jde     { get; set; }  // Data fabricação (formato JDE)
    public string luf_dataalteracao_jde      { get; set; }  // Data alteração (formato JDE)
    public string luf_datavencimento         { get; set; }  // Data vencimento (formato SQL)
    public string luf_datavalidade           { get; set; }  // Data validade (formato SQL)
    public string luf_datafabricacao         { get; set; }  // Data fabricação (formato SQL)
    public string luf_unidade_fabril         { get; set; }  // Código da unidade fabril
    public string dataultimaalteracao        { get; set; }  // Data última alteração
    public string horaultimaalteracao        { get; set; }  // Hora última alteração
    public string luf_DataUltimaAlteracao    { get; set; }  // Data última alteração (convertida)
    public string acao                       { get; set; }  // Ação (INSERT/UPDATE/NONE)
    public string idSeq                      { get; set; }  // ID Sequencial
    public DateTime IntegrationDate          { get; set; }  // Data de integração
}
```

**Campos Chave:**
- `itm_codigointerno + itm_codigosecundario + luf_numeroloteserie + luf_unidade_fabril` = Chave primária única do lote

---

## 2️⃣ Fluxo Geral do Processo

```
┌─────────────────────────────────────────────────────────────────┐
│                   SINCRONIZAÇÃO DE DADOS                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. Conexão com Bancos de Dados (JDE + EAI)                    │
│     ↓                                                            │
│  2. Criação de Tabelas Temporárias (##F4101, ##F4104, ##F4108)  │
│     ↓                                                            │
│  3. Buscar Alterações (últimos N dias)                         │
│     ↓                                                            │
│  4. Classificar Registros (INSERT vs UPDATE)                    │
│     ↓                                                            │
│  5. Montar Comandos SQL de Sincronização                        │
│     ↓                                                            │
│  6. Executar com Threads (paralelização)                        │
│     ↓                                                            │
│  7. Remover Duplicatas                                          │
│     ↓                                                            │
│  8. Limpar Tabelas Temporárias                                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3️⃣ Classes Principais

### 3.1 Classe EAI
Contém todos os métodos para sincronização de Produtos e Lotes entre JDE e EAI.

```csharp
public class EAI
{
    // Enumeração para definir o tipo de carregamento
    public enum TipoJDELoad { Produtos=1, Lotes=2 }
}
```

---

## 4️⃣ Métodos Principais

### 4.1 PlusoftJDE_tempLoad()

**Objetivo:** Criar ou dropar as tabelas temporárias necessárias para o processo de sincronização.

**Assinatura:**
```csharp
public static string PlusoftJDE_tempLoad(bool CreateMode=true, string tempTableId="")
```

**Parâmetros:**
- `CreateMode` (bool): Se verdadeiro, cria tabelas. Se falso, remove-as.
- `tempTableId` (string): ID único para as tabelas (timestamp).

**Tabelas Criadas:**
| Tabela Temp | Origem | Propósito |
|------------|--------|----------|
| ##F4101 | JDE F4101 | Dados mestres de itens |
| ##F4104 | JDE F4104 | Unidades alternativas |
| ##F0005 | JDE F0005 | Descrições padrão |
| ##F4108 | JDE F4108 | Dados de lotes/séries |

**Retorno:**
```
OK;Tabelas temporárias criadas no banco de dados - Tempo exec.: [XX:YY:ZZ]
Err;Mensagem de erro detalhada
```

**Exemplo de Uso:**
```csharp
string resultado = EAI.PlusoftJDE_tempLoad(true, "_120000");
// Cria tabelas com ID "_120000"

resultado = EAI.PlusoftJDE_tempLoad(false, "_120000");
// Remove tabelas criadas
```

---

### 4.2 ImportaProdutoLote_JDE_EAI()

**Objetivo:** Orquestrador principal que sincroniza TODOS os produtos e lotes em um único processo.

**Assinatura:**
```csharp
public static string ImportaProdutoLote_JDE_EAI(int idays=0)
```

**Parâmetros:**
- `idays` (int): Número de dias retroativos para buscar alterações (0 = hoje, -1 = histórico completo).

**Fluxo Executado:**
1. ✅ Valida conexões com JDE e EAI
2. ✅ Cria tabelas temporárias
3. ✅ Processa **PRODUTOS** (tipo = 1)
4. ✅ Processa **LOTES** (tipo = 2)
5. ✅ Remove tabelas temporárias
6. ✅ Retorna relatório

**Retorno:**
```
OK;Processamento finalizado - Tempo exec.: [XX:YY:ZZ]
Err;Mensagem de erro
```

**Exemplo de Uso:**
```csharp
// Sincronizar últimos 7 dias
string resultado = EAI.ImportaProdutoLote_JDE_EAI(-7);

// Sincronizar apenas hoje
string resultado = EAI.ImportaProdutoLote_JDE_EAI(0);

// Sincronizar histórico completo
string resultado = EAI.ImportaProdutoLote_JDE_EAI(-1);
```

---

### 4.3 ImportaProdutos_JDE_EAI()

**Objetivo:** Sincroniza produtos OU lotes com controle granular e modo de carregamento.

**Assinatura:**
```csharp
public static string ImportaProdutos_JDE_EAI(
    TipoJDELoad tipo=TipoJDELoad.Produtos, 
    int idays=-1, 
    bool truncateMode=false
)
```

**Parâmetros:**
- `tipo`: Tipo de carga (Produtos=1 ou Lotes=2)
- `idays`: Dias retroativos (-1 = histórico completo)
- `truncateMode`: Se verdadeiro, limpa a tabela antes de carregar

**Tabelas Atualizadas:**
| Tipo | Tabela |
|------|--------|
| Produtos | `tbl_IMP_ItemMestrePlusoft` |
| Lotes | `tbl_lfp_LotesFabrilPlusoft` |

**Exemplo de Uso:**
```csharp
// Carregar apenas PRODUTOS dos últimos 30 dias
string resultado = EAI.ImportaProdutos_JDE_EAI(
    TipoJDELoad.Produtos, 
    -30, 
    false
);

// Carregar todos os LOTES (modo truncate - limpa e recarrega)
string resultado = EAI.ImportaProdutos_JDE_EAI(
    TipoJDELoad.Lotes, 
    -1, 
    true
);
```

---

### 4.4 ImportaProdutos_JDE_Diff()

**Objetivo:** Sincroniza apenas dados **alterados ou novos** usando consulta diferencial.

**Assinatura:**
```csharp
public static string ImportaProdutos_JDE_Diff(
    TipoJDELoad tipo, 
    string ColsName, 
    string tempTableId="",
    int idays=0
)
```

**Características:**
- ✅ Processa apenas registro modificados
- ✅ Remove duplicatas automaticamente
- ✅ Utiliza scripts SQL específicos por tipo
- ✅ Executa em paralelo com Tasks

**Scripts SQL Utilizados:**
- Produtos: `SQLFiles\Plusoft\Plusoft_LoadProdutos.sql`
- Lotes: `SQLFiles\Plusoft\Plusoft_LoadLotes.sql`

**Exemplo de Uso:**
```csharp
string colunas = "itm_codigointerno,itm_codigosecundario,itm_descricao,...";
string resultado = EAI.ImportaProdutos_JDE_Diff(
    TipoJDELoad.Produtos,
    colunas,
    "_120000",
    -7  // Últimos 7 dias
);
```

---

### 4.5 ImportaProdutos_JDE_EAI_valida()

**Objetivo:** Valida e sincroniza dados obtidos do EAI com controle de existência.

**Assinatura:**
```csharp
public static string ImportaProdutos_JDE_EAI_valida(
    TipoJDELoad tipo, 
    List<string> lstProdsBD, 
    string ColsName
)
```

**Funcionalidades:**
- ✅ Valida se produtos/lotes já existem na BD
- ✅ Compara data/hora de última alteração
- ✅ Faz INSERT se novo, UPDATE se modificado
- ✅ Processa em paralelo com Tasks

---

### 4.6 MontaComandoSQL()

**Objetivo:** Monta dinamicamente os comandos SQL de INSERT ou UPDATE.

**Assinatura:**
```csharp
public static string MontaComandoSQL(
    TipoJDELoad tipo, 
    string strCols, 
    bool existe,
    Object obj, 
    string strchave
)
```

**Lógica:**
```
┌─────────────────────────────────────┐
│ Analisa o objeto de entrada        │
├─────────────────────────────────────┤
│ ↓                                   │
│ Se existe = FALSE  → INSERT         │
│ Se existe = TRUE   → UPDATE         │
│ ↓                                   │
│ Monta colunas e valores            │
│ ↓                                   │
│ Aplica mapping de datas JDE → SQL  │
│ ↓                                   │
│ Retorna comando pronto              │
└─────────────────────────────────────┘
```

**Conversão de Datas:**
- Campos com sufixo `_JDE` são convertidos usando `libPlusRotines.JDTOS()`
- Exemplo: `luf_datavencimento_jde` → `luf_datavencimento` (SQL)

**Exemplo de Comando Gerado:**

INSERT:
```sql
INSERT INTO tbl_IMP_ItemMestrePlusoft (
    itm_codigointerno, itm_codigosecundario, itm_descricao, ...
) VALUES (
    '001234', 'P-001', 'Produto ABC', ..., GETDATE()
)
```

UPDATE:
```sql
UPDATE tbl_IMP_ItemMestrePlusoft SET 
    itm_descricao='Produto ABC Modificado',
    IntegrationDate=GETDATE()
WHERE 
    itm_codigoInterno = '001234' 
    AND itm_codigosecundario = 'P-001'
```

---

### 4.7 LoadQueryToObject()

**Objetivo:** Converte um DataReader SQL em objeto Model (Produto ou Lote).

**Assinatura:**
```csharp
public static string LoadQueryToObject(
    TipoJDELoad tipo, 
    SqlDataReader qryJDE, 
    ref List<Object> lstObjLoad
)
```

**Processo:**
1. Lê linha do DataReader
2. Mapeia campos para propriedades do objeto
3. Converte datas no formato JDE para SQL
4. Adiciona objeto à lista de saída

---

### 4.8 JDE_Products_RemoveDuplicates()

**Objetivo:** Remove registros duplicados usando ROW_NUMBER() OVER PARTITION.

**Assinatura:**
```csharp
public static string JDE_Products_RemoveDuplicates(TipoJDELoad tipo)
```

**Lógica SQL:**
```sql
-- Cria tabela temporária com identificação de duplicatas
SELECT codigo, lote, unidade, 
       ROW_NUMBER() OVER (PARTITION BY codigo, lote ORDER BY (SELECT 0)) AS RowNum
INTO #temptable
FROM tabela_origem

-- Deleta todos os registros onde RowNum > 1
DELETE FROM tabela_origem
WHERE (codigo+lote+...) IN (
    SELECT codigo, lote FROM #temptable WHERE RowNum > 1
)

-- Limpa tabela temporária
DROP TABLE #temptable
```

---

### 4.9 Retorna_AtributosObjeto()

**Objetivo:** Obtém todos os nomes das propriedades de um objeto via Reflection.

**Assinatura:**
```csharp
public static List<String> Retorna_AtributosObjeto(Object obj)
```

**Retorno:**
```csharp
// Para Model_JDEProdutos:
// [
//   "itm_codigointerno",
//   "itm_codigosecundario",
//   "itm_descricao",
//   ... mais propriedades
// ]
```

---

## 5️⃣ Tabelas do Banco de Dados

### 5.1 Tabelas Principais (SQL Server - EAI)

#### tbl_IMP_ItemMestrePlusoft
**Descrição:** Armazena dados mestres de produtos

```sql
CREATE TABLE tbl_IMP_ItemMestrePlusoft (
    itm_codigoInterno           VARCHAR(50)      NOT NULL,
    itm_codigoSecundario        VARCHAR(50)      NOT NULL,
    itm_descricao               VARCHAR(255),
    itm_descricao2              VARCHAR(255),
    itm_ean                     VARCHAR(50),
    itm_grupodescricao          VARCHAR(100),
    itm_subgrupo                VARCHAR(50),
    itm_marcadescricao          VARCHAR(100),
    itm_unidadedemedida         VARCHAR(10),
    itm_linha                   VARCHAR(50),
    itm_classe                  VARCHAR(50),
    itm_divisao                 VARCHAR(50),
    itm_tipo                    VARCHAR(50),
    itm_categoria               VARCHAR(50),
    itm_linhaneg                VARCHAR(50),
    itm_grupo                   VARCHAR(50),
    DATAULTIMAALTERACAO         VARCHAR(20),
    HORAULTIMAALTERACAO         VARCHAR(20),
    IntegrationDate             DATETIME         DEFAULT GETDATE(),
    PRIMARY KEY (itm_codigoInterno, itm_codigoSecundario),
    INDEX IDX_ItemMestre (itm_codigoInterno, itm_codigoSecundario)
)
```

#### tbl_lfp_LotesFabrilPlusoft
**Descrição:** Armazena dados de lotes e séries de produtos

```sql
CREATE TABLE tbl_lfp_LotesFabrilPlusoft (
    itm_codigoInterno           VARCHAR(50)      NOT NULL,
    itm_codigoSecundario        VARCHAR(50)      NOT NULL,
    LUF_NUMEROLOTESERIE         VARCHAR(50)      NOT NULL,
    LUF_UNIDADE_FABRIL          VARCHAR(10)      NOT NULL,
    itm_descricao               VARCHAR(255),
    LUF_DATAVENCIMENTO          DATE,
    LUF_DATAVALIDADE            DATE,
    LUF_DATAFABRICACAO          DATE,
    LUF_DATAVENCIMENTO_JDE      VARCHAR(20),
    LUF_DATAVALIDADE_JDE        VARCHAR(20),
    LUF_DATAFABRICACAO_JDE      VARCHAR(20),
    LUF_DATAALTERACAO_JDE       VARCHAR(20),
    DATAULTIMAALTERACAO         VARCHAR(20),
    HORAULTIMAALTERACAO         VARCHAR(20),
    IntegrationDate             DATETIME         DEFAULT GETDATE(),
    PRIMARY KEY (itm_codigoInterno, itm_codigoSecundario, 
                 LUF_NUMEROLOTESERIE, LUF_UNIDADE_FABRIL),
    INDEX IDX_Lotes (itm_codigoInterno, itm_codigoSecundario, 
                     LUF_NUMEROLOTESERIE, LUF_UNIDADE_FABRIL)
)
```

### 5.2 Tabelas Temporárias (JDE - Oracle)

#### ##F4101 (Itens Mestres)
Colunas: IMLITM, IMDSC1, IMDSC2, IMITM, IMUPMJ, IMPRP1, IMUOM1, IMTDAY, IMSRP[1-5,9,0], IMPRP2

#### ##F4104 (Unidades Alternativas)
Colunas: IVCITM, IVXRT, IVUPMJ, IVITM, IVTDAY

#### ##F0005 (Descrições Padrão)
Colunas: DRSY, DRRT, DRKY, DRDL01 (Filtro: DRSY='41')

#### ##F4108 (Lotes/Séries)
Colunas: IOLOTN, IOITM, IORLOT, IOLITM, IOLDSC, IOMMEJ, IOBBDJ, IOOHDJ, IOMCU, IOUPMJ, IOTDAY

---

## 6️⃣ Processo de Sincronização

### 6.1 Fluxo Detalhado para Produtos

```
INÍCIO
  │
  ├─ 1. Conectar JDE e EAI
  │    └─ Validar Estado das Conexões
  │
  ├─ 2. Criar Tabelas Temporárias
  │    ├─ ##F4101 (Itens)
  │    ├─ ##F4104 (Unidades)
  │    ├─ ##F0005 (Descrições)
  │    └─ ##F4108 (Lotes)
  │
  ├─ 3. Buscar Dados Alterados
  │    ├─ Executar SQL de carga (Plusoft_LoadProdutos.sql)
  │    ├─ Filtrar por data: IMUPMJ >= [data_jde]
  │    └─ Carregar em DataReader
  │
  ├─ 4. Processar Registros (PARALELO)
  │    ├─ Para cada registro:
  │    │  ├─ Verificar se existe na BD EAI
  │    │  ├─ Determinar ação (INSERT/UPDATE)
  │    │  ├─ Montar comando SQL
  │    │  └─ Adicionar à lista de execução
  │    └─ Executar comando no BD
  │
  ├─ 5. Remover Duplicatas
  │    ├─ Criar tabela temp com ROW_NUMBER
  │    ├─ Deletar registros com RowNum > 1
  │    └─ Dropar tabela temporária
  │
  ├─ 6. Limpar Tabelas Temp do JDE
  │    ├─ DROP ##F4101
  │    ├─ DROP ##F4104
  │    ├─ DROP ##F0005
  │    └─ DROP ##F4108
  │
  └─ FIM ✓
     └─ Retornar Status e Tempo Exec.
```

### 6.2 Fluxo Detalhado para Lotes

Idêntico ao de Produtos, com diferenças:

| Aspecto | Produtos | Lotes |
|---------|----------|-------|
| Script SQL | Plusoft_LoadProdutos.sql | Plusoft_LoadLotes.sql |
| Tabela Destino | tbl_IMP_ItemMestrePlusoft | tbl_lfp_LotesFabrilPlusoft |
| Chave Primária | código + secundário | código + secundário + lote + unidade |
| Campo Data | IMUPMJ (F4101) | IOUPMJ (F4108) |

---

### 6.3 Conversão de Datas

**Formato JDE → SQL:**

```csharp
// JDE armazena datas como número inteiro (dias desde 1900-01-01)
// Exemplo: 119000 = 2019-12-06

int datajde = 119000;
string dataSql = libPlusRotines.JDTOS(datajde, true);
// Resultado: "2019-12-06"
```

**Campos Convertidos:**
- `luf_datavencimento_jde` → `luf_datavencimento`
- `luf_datavalidade_jde` → `luf_datavalidade`
- `luf_datafabricacao_jde` → `luf_datafabricacao`
- `dataultimaalteracao` (JDE) → `dataultimaalteracao` (SQL)

---

## 7️⃣ Tratamento de Erros

### 7.1 Padrão de Retorno

Todos os métodos retornam string no padrão:

```
"OK;Mensagem de sucesso - Tempo exec.: 00:05:32"
"Err;Nome_Metodo()-Descrição do erro"
```

### 7.2 Validações Realizadas

| Validação | Ação |
|-----------|------|
| Conexão BD nula | Tenta reconectar ou retorna erro |
| Script SQL não encontrado | Retorna erro com nome do arquivo |
| Campo vazio | Atribui valor "null" no SQL |
| Data inválida | Cai em try/catch, atribui null |
| Registro duplicado | Removido ao final do processo |

### 7.3 Tratamento de Exceções

```csharp
try 
{
    // Código de sincronização
}
catch (Exception ex)
{
    strRet = "Err;NomeMétodo()-" + ex.Message;
    // Log gravado via libPlusRotines.GravaLogFile()
}
return strRet;
```

---

## 8️⃣ Exemplos de Uso

### Exemplo 1: Sincronização Completa Diária

```csharp
// Sincronizar Produtos e Lotes dos últimos 7 dias
string resultado = EAI.ImportaProdutoLote_JDE_EAI(-7);

if (resultado.StartsWith("OK"))
{
    Console.WriteLine("✓ Sincronização realizada com sucesso!");
    // Extrair tempo de execução
    // "OK;...Tempo exec.: 00:15:42"
}
else
{
    Console.WriteLine("✗ Erro: " + resultado);
}
```

### Exemplo 2: Sincronização Seletiva de Lotes

```csharp
// Sincronizar apenas LOTES, modo truncate (limpa tudo e recarrega)
string resultado = EAI.ImportaProdutos_JDE_EAI(
    tipo: TipoJDELoad.Lotes,
    idays: -1,                    // Histórico completo
    truncateMode: true            // Limpa tabela antes
);
```

### Exemplo 3: Sincronização Incremental (Últimas 24h)

```csharp
// Busca apenas alterações das últimas 24 horas
DateTime tempoIni = DateTime.Now;

string resultado = EAI.ImportaProdutoLote_JDE_EAI(
    idays: -1  // Últimas 24 horas
);

TimeSpan duracao = DateTime.Now - tempoIni;
Console.WriteLine($"Tempo total: {duracao:hh\\:mm\\:ss}");
```

### Exemplo 4: Verificação de Duplicatas

```csharp
// Remover duplicatas após sincronização
string resultado = EAI.JDE_Products_RemoveDuplicates(
    TipoJDELoad.Produtos
);

if (resultado.StartsWith("OK"))
{
    Console.WriteLine("✓ Duplicatas removidas");
}
```

---

## 🔧 Utilitários Utilizados

### libPlusRotines
Classe com funções auxiliares:
- `JDTOS(int jdeDate, bool formatted)` - Converte data JDE para string SQL
- `STOJD(string sqlDate)` - Converte data SQL para JDE (int)
- `TempoDecorrido(DateTime dtIni)` - Calcula tempo decorrido (HH:MM:SS)
- `GravaLogFile(string mensagem)` - Grava log em arquivo
- `checkdir(string caminho)` - Cria diretório se não existir

### db.rotDatabase
Classe com operações de BD:
- `SQLRun(string sql, SqlConnection cn)` - Executa SQL
- `BulkCopyORA2MSSql()` - Copia dados de Oracle para SQL Server
- `SQLRetornaCampo()` - Retorna coluna de uma query
- `SQLFileToString()` - Lê arquivo SQL e retorna como string

---

## 📊 Monitoramento e Logs

### 7.1 Arquivo de Log
- Caminho: Definido em `libPlusRotines`
- Conteúdo: Todas as operações e erros
- Formato: 
  ```
  [timestamp] [Tipo] Mensagem
  [2024-04-20 15:30:45] [INFO] Iniciando sincronização
  [2024-04-20 15:35:10] [OK] Processamento finalizado
  ```

### 7.2 Métricas Importantes
- **iqtditens**: Quantidade de registros processados
- **irecords**: Quantidade de registros lidos
- **Tempo de Execução**: Calculado e retornado ao fim

---

## ⚙️ Parâmetros de Configuração

### Ambiente
```csharp
// QA (Homologação) ou PRODUÇÃO (2)
svcEnvolvaLoadFiles.svcEnvolvaLoadFiles.objCfg.Ambiente
```

### Schema JDE
```
QA:    QADTA
PROD:  PRODDTA
```

### Filtros SQL
```sql
-- Produtos
IMPRP1 IN ('PA','AG','RV')  -- Apenas categorias válidas
IVXRT = 'UP'                -- Apenas unidades principais

-- Lotes
LENGTH(TRIM(IOMCU))=4      -- Apenas códigos de centro com 4 caracteres
```

---

## 🚀 Performance e Otimizações

### Parallelização com Tasks
```csharp
// Múltiplos registros processados simultaneamente
var tasks = lstUpdate.Select(command => Task.Run(() =>
{
    strRet = db.rotDatabase.SQLRun(command, ConectaBD.cnxBDEAI);
}));
Task.WaitAll(tasks.ToArray());
```

### Índices Criados
```sql
-- Produtos
CREATE INDEX IDX_ItemMestre ON tbl_IMP_ItemMestrePlusoft 
    (itm_codigoInterno, itm_codigoSecundario)

-- Lotes
CREATE INDEX IDX_Lotes ON tbl_lfp_LotesFabrilPlusoft 
    (itm_codigoInterno, itm_codigoSecundario, 
     LUF_NUMEROLOTESERIE, LUF_UNIDADE_FABRIL)
```

### Bulk Copy (Oracle → SQL)
- Transferência rápida de dados via BulkCopy
- Utiliza conexões diretas
- Menor consumo de I/O

---

## 📞 Suporte

**Responsáveis:**
- Desenvolvimento: Plusoft / Biolab Sanus
- Manutenção: Equipe de Integração EAI
- Banco de Dados: DBA

**Documentação Relacionada:**
- `Plusoft_LoadProdutos.sql` - Query de sincronização de produtos
- `Plusoft_LoadLotes.sql` - Query de sincronização de lotes
- `Plusoft_LoadProdutos_EAI.sql` - Query de validação EAI para produtos
- `Plusoft_LoadLotes_EAI.sql` - Query de validação EAI para lotes

---

## 📝 Histórico de Revisões

| Data | Versão | Autor | Alterações |
|------|--------|-------|-----------|
| 2024-04-20 | 1.0 | Documentação Técnica | Criação inicial |

---

**Documento de Referência Técnica**  
Biolab Sanus Farmacêutica - Sistema Plusoft  
Integração JDE / EAI
