import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const configAiPath = path.join(__dirname, 'src/apps/backend/src/ai/config/configai.json');
const raw = fs.readFileSync(configAiPath, 'utf8');
const customConfig = JSON.parse(raw);

console.log('Headers:', customConfig.headers);

fetch(customConfig.apiUrl, {
    method: 'POST',
    headers: customConfig.headers,
    body: JSON.stringify({
        model: 'openai/gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'hello' }]
    })
}).then(res => res.text()).then(console.log).catch(console.error);
