import {spawnSync} from 'node:child_process';
import {readdirSync} from 'node:fs';
for(const path of [...readdirSync('.').filter(p=>p.endsWith('.mjs')),...readdirSync('public').filter(p=>p.endsWith('.js')).map(p=>'public/'+p)]){const r=spawnSync(process.execPath,['--check',path],{stdio:'inherit'});if(r.status!==0)process.exit(r.status||1)}
console.log('JavaScript syntax checks passed');
