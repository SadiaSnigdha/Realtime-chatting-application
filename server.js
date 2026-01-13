const WebSocket = require('ws');
const http = require('http');
const fs = require('fs');
const path = require('path');

const server = http.createServer((req, res) => {
    let filePath = '.' + req.url;
    if (filePath === './') {
        filePath = './index.html';
    }

    const extname = String(path.extname(filePath)).toLowerCase();
    const mimeTypes = {
        '.html': 'text/html',
        '.js': 'text/javascript',
        '.css': 'text/css'
    };

    const contentType = mimeTypes[extname] || 'application/octet-stream';

    fs.readFile(filePath, (error, content) => {
        if (error) {
            if (error.code === 'ENOENT') {
                res.writeHead(404);
                res.end('File not found');
            } else {
                res.writeHead(500);
                res.end('Server error: ' + error.code);
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
});


const wss = new WebSocket.Server({ server });


const clients = new Map();
let userIdCounter = 0;


const messageHistory = [];
const MAX_HISTORY = 100;


function broadcast(message, excludeClient = null) {
    wss.clients.forEach((client) => {
        if (client !== excludeClient && client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(message));
        }
    });
}


function sendToClient(client, message) {
    if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(message));
    }
}


wss.on('connection', (ws) => {
    console.log('New client connected');
    
  
    const userId = ++userIdCounter;
    clients.set(ws, { userId, username: `User${userId}` });

  
    sendToClient(ws, {
        type: 'system',
        message: 'Welcome to the chat room! Please set your username.',
        userId: userId
    });

   
    ws.on('message', (data) => {
        try {
            const message = JSON.parse(data);
            const clientInfo = clients.get(ws);

            switch (message.type) {
                case 'username':
                  
                    const oldUsername = clientInfo.username;
                    clientInfo.username = message.username;
                    clients.set(ws, clientInfo);

                    
                    broadcast({
                        type: 'system',
                        message: `${oldUsername} changed their name to ${message.username}`
                    });

                    
                    if (messageHistory.length > 0) {
                        sendToClient(ws, {
                            type: 'history',
                            messages: messageHistory
                        });
                    }

                   
                    sendToClient(ws, {
                        type: 'system',
                        message: `Your username has been set to ${message.username}`
                    });

                   
                    broadcast({
                        type: 'user-joined',
                        username: message.username,
                        message: `${message.username} joined the chat`,
                        onlineUsers: Array.from(clients.values()).map(c => c.username)
                    }, ws);
                    break;

                case 'message':
                    
                    const userMessage = {
                        type: 'message',
                        username: clientInfo.username,
                        message: message.message,
                        timestamp: new Date().toLocaleTimeString()
                    };

                    messageHistory.push(userMessage);
                    
                    if (messageHistory.length > MAX_HISTORY) {
                        messageHistory.shift();
                    }
                   
                    broadcast(userMessage);
                    break;

                default:
                    console.log('Unknown message type:', message.type);
            }
        } catch (error) {
            console.error('Error processing message:', error);
        }
    });

    ws.on('close', () => {
        const clientInfo = clients.get(ws);
        if (clientInfo) {
            console.log(`Client disconnected: ${clientInfo.username}`);
            
            broadcast({
                type: 'user-left',
                username: clientInfo.username,
                message: `${clientInfo.username} left the chat`,
                onlineUsers: Array.from(clients.values())
                    .filter(c => c.userId !== clientInfo.userId)
                    .map(c => c.username)
            });

            clients.delete(ws);
        }
    });

    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log(`WebSocket server is ready for connections`);
});
