import React, { useState } from 'react';
import { Download, FileText, FileSpreadsheet, File, Loader2 } from 'lucide-react';
import ExcelJS from 'exceljs';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const ExportButtons = ({ data, filenamePrefix = 'export', headers = [], mapRow = (row) => row, chartsRef = null }) => {
  const [isExportingExcel, setIsExportingExcel] = useState(false);

  if (!data || data.length === 0) return null;

  const exportToCSV = () => {
    const csvRows = [];
    csvRows.push(headers.join(','));
    
    data.forEach(row => {
      const mappedRow = mapRow(row);
      const values = headers.map(header => {
        let val = mappedRow[header];
        if (val === null || val === undefined) val = '';
        val = String(val).replace(/"/g, '""');
        if (val.includes(',') || val.includes('\n')) val = `"${val}"`;
        return val;
      });
      csvRows.push(values.join(','));
    });
    
    const csvString = "\uFEFF" + csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${filenamePrefix}_${new Date().getTime()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToExcel = async () => {
    try {
      setIsExportingExcel(true);
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Dados');

      // 1. Add Headers
      const headerRow = worksheet.addRow(headers);
      headerRow.eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF4F46E5' } // Indigo 600
        };
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      });

      // 2. Add Data
      data.forEach(row => {
        const mappedRow = mapRow(row);
        const values = headers.map(h => {
            let val = mappedRow[h];
            if (val === null || val === undefined) return '';
            return val;
        });
        const excelRow = worksheet.addRow(values);

        excelRow.eachCell((cell, colNumber) => {
          const headerStr = headers[colNumber - 1].toLowerCase();
          
          cell.alignment = { vertical: 'middle' };

          if (typeof cell.value === 'number') {
            if (
                headerStr.includes('r$') || 
                headerStr.includes('receita') || 
                headerStr.includes('meta orça') || 
                headerStr.includes('projeção') || 
                headerStr.includes('faturamento') || 
                headerStr.includes('fat médio') || 
                headerStr.includes('impacto')
            ) {
              cell.numFmt = '"R$" #,##0.00';
            } else if (
                headerStr.includes('%') || 
                headerStr.includes('eficiência') || 
                headerStr.includes('sla') || 
                headerStr.includes('tdna') || 
                headerStr.includes('fcb')
            ) {
              cell.numFmt = '#,##0.00'; 
            } else {
              cell.numFmt = '#,##0.##'; // Default number format
            }
          }
        });
      });

      // 3. Auto-size columns
      worksheet.columns.forEach((column, i) => {
        let maxLen = headers[i].length;
        column.eachCell({ includeEmpty: false }, (cell) => {
            const valStr = cell.value ? cell.value.toString() : '';
            if (valStr.length > maxLen) maxLen = valStr.length;
        });
        column.width = Math.min(Math.max(maxLen + 2, 12), 50);
      });

      // 4. Capture and embed charts if chartsRef is provided
      if (chartsRef && chartsRef.current) {
        try {
          // Wait a small delay to ensure rendering is complete
          await new Promise(resolve => setTimeout(resolve, 300));
          const canvas = await html2canvas(chartsRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false });
          const imgData = canvas.toDataURL('image/png');
          
          const imageId = workbook.addImage({
              base64: imgData,
              extension: 'png',
          });
          
          const lastRow = worksheet.lastRow ? worksheet.lastRow.number : data.length + 1;
          // Image dimensions
          const imgWidth = canvas.width;
          const imgHeight = canvas.height;
          // Calculate dimensions to fit nicely in Excel (empirical ratio ~ 0.5 to 0.7)
          const excelImgWidth = Math.floor(imgWidth * 0.5);
          const excelImgHeight = Math.floor(imgHeight * 0.5);

          worksheet.addImage(imageId, {
              tl: { col: 0, row: lastRow + 2 },
              ext: { width: Math.max(excelImgWidth, 100), height: Math.max(excelImgHeight, 100) }
          });
        } catch (chartError) {
          console.warn('Erro ao capturar os gráficos. Exportando apenas os dados.', chartError);
          // Omitimos o alert para não interromper a exportação dos dados, ou poderíamos usar um toast
        }
      }

      // 5. Save the file
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `${filenamePrefix}_${new Date().getTime()}.xlsx`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
    } catch (error) {
      console.error('Erro ao gerar Excel com ExcelJS:', error);
      alert('Houve um erro ao gerar o arquivo Excel.');
    } finally {
      setIsExportingExcel(false);
    }
  };

  const exportToPDF = () => {
    const doc = new jsPDF('landscape');
    
    // Configurações de estilo
    doc.setFontSize(18);
    doc.text(`Relatório - ${filenamePrefix.replace(/_/g, ' ').toUpperCase()}`, 14, 22);
    
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 14, 30);
    
    const bodyData = data.map(row => {
        const mappedRow = mapRow(row);
        return headers.map(header => {
            const val = mappedRow[header];
            if (typeof val === 'number' && header.includes('R$')) {
                 return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
            }
            return val !== null && val !== undefined ? String(val) : '-';
        });
    });

    doc.autoTable({
      startY: 36,
      head: [headers],
      body: bodyData,
      theme: 'grid',
      headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [249, 250, 251] },
      styles: { fontSize: 9, cellPadding: 3 },
    });

    doc.save(`${filenamePrefix}_${new Date().getTime()}.pdf`);
  };

  return (
    <div className="flex items-center gap-2">
      <button 
        onClick={exportToExcel}
        disabled={isExportingExcel}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors border shadow-sm ${isExportingExcel ? 'bg-emerald-100 text-emerald-400 border-emerald-200 cursor-not-allowed' : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'}`}
        title="Exportar Excel"
      >
        {isExportingExcel ? <Loader2 size={16} className="animate-spin" /> : <FileSpreadsheet size={16} />}
        <span className="hidden sm:inline">{isExportingExcel ? 'Gerando...' : 'Excel'}</span>
      </button>
      
      <button 
        onClick={exportToCSV}
        className="flex items-center gap-2 bg-slate-50 hover:bg-slate-100 text-slate-700 px-3 py-2 rounded-lg text-sm font-medium transition-colors border border-slate-200 shadow-sm"
        title="Exportar CSV"
      >
        <FileText size={16} />
        <span className="hidden sm:inline">CSV</span>
      </button>

      <button 
        onClick={exportToPDF}
        className="flex items-center gap-2 bg-rose-50 hover:bg-rose-100 text-rose-700 px-3 py-2 rounded-lg text-sm font-medium transition-colors border border-rose-200 shadow-sm"
        title="Exportar PDF"
      >
        <File size={16} />
        <span className="hidden sm:inline">PDF</span>
      </button>
    </div>
  );
};

export default ExportButtons;
