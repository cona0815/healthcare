import http from 'http';

const data = JSON.stringify({
  model: 'gemini-2.5-flash',
  contents: 'What is 1+1?'
});

const req = http.request({
  hostname: 'localhost',
  port: 3000,
  path: '/api/gemini/generateContent',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data)
  }
}, (res) => {
  let body = '';
  res.on('data', d => body += d);
  res.on('end', () => console.log('STATUS:', res.statusCode, 'BODY:', body));
});

req.on('error', (e) => console.error(e));
req.write(data);
req.end();
