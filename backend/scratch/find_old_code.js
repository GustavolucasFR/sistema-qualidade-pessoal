const fs = require('fs');

const path = 'c:\\Users\\TECNOMULTI\\.gemini\\antigravity-ide\\brain\\0ad85989-6e53-4583-884c-03fff8add8ed\\.system_generated\\logs\\transcript.jsonl';
const lines = fs.readFileSync(path, 'utf8').split('\n');

for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('exports.getProducaoBa = ')) {
        console.log('Found getProducaoBa at line', i);
        let content = lines[i];
        // The line is a JSON object.
        try {
            let obj = JSON.parse(content);
            if (obj.tool_calls) {
               for (let call of obj.tool_calls) {
                   if (call.name === 'default_api:view_file' || call.name === 'default_api:write_to_file') {
                       console.log(JSON.stringify(call).substring(0, 500));
                   }
               }
            }
            if (obj.content && obj.content.includes('exports.getProducaoBa')) {
                 fs.writeFileSync('scratch/old_code.txt', obj.content);
                 console.log('Wrote to scratch/old_code.txt');
            }
            if (obj.tool_responses) {
                // Not possible in this format
            }
        } catch(e) {}
    }
}
