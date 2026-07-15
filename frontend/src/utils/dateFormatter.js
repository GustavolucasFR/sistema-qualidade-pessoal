export const formatarMesAno = (yyyyMm) => {
    if (!yyyyMm || yyyyMm === 'Todos') return 'Todos os Meses';
    
    // Suporta o formato YYYY-MM
    const parts = yyyyMm.split('-');
    if (parts.length < 2) return yyyyMm;
    
    const year = parts[0];
    const month = parseInt(parts[1], 10);
    
    const meses = [
        '', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    
    if (month >= 1 && month <= 12) {
        return `${meses[month]} de ${year}`;
    }
    
    return yyyyMm;
};
