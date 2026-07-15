const ExcelJS = require('exceljs');
async function run() {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Dados');
    
    // Add dummy image with prefix
    const imgData = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
    
    const imageId = workbook.addImage({
        base64: imgData,
        extension: 'png',
    });
    
    worksheet.addImage(imageId, {
        tl: { col: 0, row: 5 },
        ext: { width: 100, height: 100 }
    });
    
    try {
        await workbook.xlsx.writeBuffer();
        console.log('Success with prefix');
    } catch(e) {
        console.error('Failed with prefix:', e.message);
    }
}
run();
