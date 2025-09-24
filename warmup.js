// Simple warmup script to keep fly.io app active
const https = require('https');
const http = require('http');

const APP_URL = 'https://faye-proud-mountain-3845.fly.dev'; // Replace with your actual fly.io URL

function warmup() {
    const url = `${APP_URL}/api/health`;
    console.log(`Warming up: ${url}`);
    
    const request = https.get(url, (response) => {
        let data = '';
        
        response.on('data', (chunk) => {
            data += chunk;
        });
        
        response.on('end', () => {
            console.log(`Warmup successful: ${response.statusCode}`, JSON.parse(data));
        });
    });
    
    request.on('error', (error) => {
        console.error('Warmup failed:', error.message);
    });
    
    request.setTimeout(10000, () => {
        console.log('Warmup timeout');
        request.destroy();
    });
}

// Initial warmup
warmup();

// Keep alive every 10 minutes
setInterval(warmup, 10 * 60 * 1000);

console.log('Warmup service started. Keeping app alive every 10 minutes...');