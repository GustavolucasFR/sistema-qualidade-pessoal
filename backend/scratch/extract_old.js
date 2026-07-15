const fs = require('fs');
const lines = fs.readFileSync('c:/Users/TECNOMULTI/.gemini/antigravity-ide/brain/0ad85989-6e53-4583-884c-03fff8add8ed/.system_generated/logs/transcript_full.jsonl', 'utf8').split('\n');
for(let l of lines){
    try{
        let o = JSON.parse(l);
        if(o.tool_responses){
            for(let r of o.tool_responses){
                if(r.name === 'default_api:view_file' && r.output && r.output.includes('exports.getProducaoBa =')){
                    fs.writeFileSync('scratch/exact_old_code.txt', r.output);
                    console.log('Wrote old code!');
                    process.exit(0);
                }
            }
        }
    }catch(e){}
}
console.log('Not found');
