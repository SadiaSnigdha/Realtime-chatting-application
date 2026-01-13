let ws;
let username = '';
let isConnected = false;

const messagesDiv = document.getElementById('messages');
const messageInput = document.getElementById('messageInput');
const sendButton = document.getElementById('sendButton');
const usernameModal = document.getElementById('usernameModal');
const usernameInput = document.getElementById('usernameInput');
const joinButton = document.getElementById('joinButton');
const modalStatus = document.getElementById('modalStatus');
const onlineUsersDiv = document.getElementById('onlineUsers');
const userCountSpan = document.getElementById('userCount');
const connectionStatus = document.getElementById('connectionStatus');

function connect() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;
    
    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
        console.log('Connected to server');
        isConnected = true;
        updateConnectionStatus('connected');
        addSystemMessage('Connected to server');
        
        if (joinButton) {
            joinButton.disabled = false;
        }
        if (modalStatus) {
            modalStatus.textContent = 'Connected! Ready to join.';
            modalStatus.style.color = '#4caf50';
        }
    };

    ws.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            handleMessage(data);
        } catch (error) {
            console.error('Error parsing message:', error);
        }
    };

    ws.onclose = () => {
        console.log('Disconnected from server');
        isConnected = false;
        updateConnectionStatus('disconnected');
        addSystemMessage('Disconnected from server. Attempting to reconnect...');
        
        messageInput.disabled = true;
        sendButton.disabled = true;
        if (joinButton) {
            joinButton.disabled = true;
        }
        if (modalStatus) {
            modalStatus.textContent = 'Reconnecting...';
            modalStatus.style.color = '#ff9800';
        }

        setTimeout(connect, 3000);
    };

    ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        addSystemMessage('Connection error occurred');
    };
}

function handleMessage(data) {
    switch (data.type) {
        case 'system':
            addSystemMessage(data.message);
            break;

        case 'history':
            // Load message history
            if (data.messages && data.messages.length > 0) {
                addSystemMessage('--- Previous messages ---', 'system-info');
                data.messages.forEach(msg => {
                    addUserMessage(msg.username, msg.message, msg.timestamp);
                });
                addSystemMessage('--- You are now up to date ---', 'system-info');
            }
            break;

        case 'message':
            addUserMessage(data.username, data.message, data.timestamp);
            break;

        case 'user-joined':
            addSystemMessage(data.message, 'user-joined');
            updateOnlineUsers(data.onlineUsers);
            break;

        case 'user-left':
            addSystemMessage(data.message, 'user-left');
            updateOnlineUsers(data.onlineUsers);
            break;

        default:
            console.log('Unknown message type:', data.type);
    }
}

function setUsername() {
    const inputUsername = usernameInput.value.trim();
    
    if (inputUsername === '') {
        alert('Please enter a username');
        return;
    }

    if (inputUsername.length < 2) {
        alert('Username must be at least 2 characters long');
        return;
    }

    username = inputUsername;

    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
            type: 'username',
            username: username
        }));

        usernameModal.classList.add('hidden');
        messageInput.disabled = false;
        sendButton.disabled = false;
        messageInput.focus();
    } 
    else {
      
        alert('Connecting to server... Please wait a moment and try again.');
        console.log('WebSocket not ready. Current state:', ws ? ws.readyState : 'ws is null');
    }
}

function sendMessage() {
    const message = messageInput.value.trim();

    if (message === '') {
        return;
    }

    if (!isConnected) {
        addSystemMessage('Not connected to server');
        return;
    }


    ws.send(JSON.stringify({
        type: 'message',
        message: message
    }));

    messageInput.value = '';
    messageInput.focus();
}

function addSystemMessage(message, className = '') {
    const messageDiv = document.createElement('div');
    messageDiv.className = `system-message ${className}`;
    messageDiv.textContent = message;
    messagesDiv.appendChild(messageDiv);
    scrollToBottom();
}

function addUserMessage(senderUsername, message, timestamp) {
    const messageDiv = document.createElement('div');

    const isOwnMessage = senderUsername === username;
    messageDiv.className = isOwnMessage ? 'message message-own' : 'message message-other';

    const headerDiv = document.createElement('div');
    headerDiv.className = 'message-header';

    const usernameSpan = document.createElement('span');
    usernameSpan.className = 'message-username';
    usernameSpan.textContent = isOwnMessage ? 'You' : senderUsername;

    const timestampSpan = document.createElement('span');
    timestampSpan.className = 'message-timestamp';
    timestampSpan.textContent = timestamp;

    headerDiv.appendChild(usernameSpan);
    headerDiv.appendChild(timestampSpan);

    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    contentDiv.textContent = message;

    messageDiv.appendChild(headerDiv);
    messageDiv.appendChild(contentDiv);
    messagesDiv.appendChild(messageDiv);
    scrollToBottom();
}


function updateOnlineUsers(users) {
    if (!users || users.length === 0) {
        onlineUsersDiv.innerHTML = '<div class="user-item">No users online</div>';
        userCountSpan.textContent = '0';
        return;
    }

    onlineUsersDiv.innerHTML = '';
    users.forEach(user => {
        const userDiv = document.createElement('div');
        userDiv.className = 'user-item';
        userDiv.textContent = user;
        onlineUsersDiv.appendChild(userDiv);
    });

    userCountSpan.textContent = users.length;
}


function updateConnectionStatus(status) {
    const indicator = connectionStatus.querySelector('.status-indicator');
    const text = connectionStatus.querySelector('.status-text');

    indicator.className = `status-indicator ${status}`;

    switch (status) {
        case 'connected':
            text.textContent = 'Connected';
            break;
        case 'disconnected':
            text.textContent = 'Disconnected';
            break;
        default:
            text.textContent = 'Connecting...';
    }
}


function scrollToBottom() {
    if (messagesDiv) {
        setTimeout(() => {
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
        }, 100);
    }
}


messageInput.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
        sendMessage();
    }
});

usernameInput.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
        setUsername();
    }
});


connect();
