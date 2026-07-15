import json
import os

def format_currency(val):
    return f"R$ {val:,.2f}".replace(',', 'X').replace('.', ',').replace('X', '.')

try:
    with open('differences.json', 'r') as f:
        diffs = json.load(f)
        
    markdown = "# Diferenças de Receita por OS (Banco vs Planilha BA)\n\n"
    markdown += "Abaixo está a lista completa de Ordens de Serviço (OS) que estão com receita calculada a menor ou zerada na planilha do Excel/PowerBI, mas que o banco de dados corrigiu usando a tabela de regras de negócio atualizada.\n\n"
    markdown += "Isso totaliza os exatos **R$ 16.799,76** de diferença entre o Excel e o novo Dashboard.\n\n"
    
    markdown += "| OS | Tipo de Atividade | Valor Planilha (BA) | Valor Banco de Dados | Diferença |\n"
    markdown += "|---|---|---|---|---|\n"
    
    for d in diffs:
        markdown += f"| `{d['os']}` | {d['atividade']} | {format_currency(d['excel'])} | {format_currency(d['banco'])} | **+{format_currency(d['diferenca'])}** |\n"
        
    artifact_path = r'C:\Users\TECNOMULTI\.gemini\antigravity-ide\brain\467f0d2b-28e2-4aa7-893a-eedf3869c527\Diferencas_OS_BA.md'
    with open(artifact_path, 'w', encoding='utf-8') as f:
        f.write(markdown)
    
    print("Exported Diferencas_OS_BA.md to artifacts")
except Exception as e:
    import traceback
    traceback.print_exc()
