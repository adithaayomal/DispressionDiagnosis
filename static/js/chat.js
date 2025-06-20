const chatForm = document.getElementById('chat-form');
const chatMessages = document.getElementById('chat-messages');
const userInput = document.getElementById('user-input');

function appendMessage(sender, message) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}-message`;
    messageDiv.textContent = message;
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Add a typing indicator (3-dots) animation to the chat window while waiting for bot response
function addTypingIndicator() {
    const typingDiv = document.createElement('div');
    typingDiv.className = 'message bot-message typing-indicator';
    typingDiv.innerHTML = '<span class="dot"></span><span class="dot"></span><span class="dot"></span>';
    typingDiv.id = 'typing-indicator';
    chatMessages.appendChild(typingDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function removeTypingIndicator() {
    const typingDiv = document.getElementById('typing-indicator');
    if (typingDiv) typingDiv.remove();
}

function isHTMLResponse(text) {
    return /<html[\s\S]*<\/html>/i.test(text);
}

function sendMessage() {
    const message = userInput.value.trim();
    if (!message) return;
    appendMessage('user', message);
    userInput.value = '';
    addTypingIndicator();
    fetch('/next_question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: message }),
        credentials: 'same-origin' // Ensure cookies/session are sent
    })
    .then(async response => {
        removeTypingIndicator();
        let text = await response.text();
        // Detect if we got an HTML page (e.g., login page)
        if (isHTMLResponse(text)) {
            appendMessage('bot', 'Session expired. Please log in again.');
            return;
        }
        let data;
        try {
            data = JSON.parse(text);
        } catch (e) {
            appendMessage('bot', 'Sorry, there was a problem with the server response.');
            return;
        }
        if (data.response) {
            if (Array.isArray(data.response)) {
                data.response.forEach(msg => appendMessage('bot', msg));
            } else {
                appendMessage('bot', data.response);
            }
        } else {
            appendMessage('bot', 'Sorry, I did not get a valid response.');
        }
    })
    .catch(error => {
        removeTypingIndicator();
        appendMessage('bot', 'Sorry, something went wrong. Please try again.');
    });
}

// Enter key triggers sendMessage
userInput.addEventListener('keypress', function(event) {
    if (event.key === 'Enter') {
        sendMessage();
    }
});
