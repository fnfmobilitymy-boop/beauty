import {backupPlatform} from '../storage.mjs';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
const destination=process.argv[2];if(!destination)throw Error('Usage: node scripts/backup.mjs /secure/location/backup.sqlite [data-directory]');const directory=process.argv[3]?pathToFileURL(resolve(process.argv[3])+'/'):new URL('../data/',import.meta.url);await backupPlatform(directory,resolve(destination));console.log('Platform backup created (existing files are never overwritten)');
