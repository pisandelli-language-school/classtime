# Faturamento

O módulo de Faturamento centraliza o cálculo de pagamentos baseado nas horas aprovadas.

## Como Funciona

1.  **Fechamento do Mês**: Ao final do mês, o admin acessa a área de Faturas.
2.  **Geração de Fatura**: O sistema busca todas as horas **APROVADAS** do período.
    *   *Nota*: Horas pendentes ou rejeitadas **não** entram na soma.
3.  **Cálculo**:
    *   `Horas Aprovadas` x `Valor Hora` do contrato.
    *   Adicionais e Descontos podem ser inseridos manualmente.
4.  **Emissão**: Uma vez gerada, a fatura pode ser impressa ou salva em PDF para envio ao financeiro.

## Importante

O sistema usa um conceito de **Dias Úteis** para calcular a data de vencimento do pagamento, baseado nas regras configuradas para cada professor (ex: pagamento no 5º dia útil).
