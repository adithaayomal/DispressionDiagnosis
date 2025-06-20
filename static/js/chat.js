const chatForm = document.getElementById('chat-form');
const chatMessages = document.getElementById('chat-messages');
const chatContainer = document.querySelector('#chat-container');
const messageInput = document.querySelector('#message-input');

async function sendMessage(message) {
    try {
        // Display user message
        appendMessage('user', message);
        
        const response = await fetch('/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ message })
        });
        
        const data = await response.json();
        
        // Display bot's main response
        appendMessage('bot', data.response);
        
        // Display follow-up question after a short delay
        setTimeout(() => {
            appendMessage('bot', data.follow_up);
        }, 1000);
        
    } catch (error) {
        console.error('Error:', error);
        appendMessage('bot', 'Sorry, something went wrong. Please try again.');
    }
}

function appendMessage(sender, message) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}-message`;
    messageDiv.textContent = message;
    chatContainer.appendChild(messageDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

// Initialize chat
document.addEventListener('DOMContentLoaded', () => {
    sendMessage('start'); // This will trigger the initial greeting
});
