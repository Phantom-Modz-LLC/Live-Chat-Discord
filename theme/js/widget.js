let channelId; // Store the channel ID for messaging
let webhookUrl; // Store the webhook URL for messaging
let pollingIntervalId; // To store the interval ID for polling messages

function toggleChat() {
  const chatWindow = document.getElementById('chatWindow');
  chatWindow.style.display = chatWindow.style.display === 'block' ? 'none' : 'block';
}

async function startChat() {
  const username = document.getElementById('chat-username').value;
  const response = await fetch('http://192.168.1.1/start-chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username }),
  });

  const data = await response.json();
  const chatLink = document.getElementById('chat-link');
  const startChatButton = document.getElementById('start-chat-button'); // Get the start chat button

  if (response.ok) {
    channelId = data.channelId; // Store the channel ID for further use
    webhookUrl = data.webhookUrl; // Store the webhook URL for sending messages
    startChatButton.style.display = 'none'; // Hide the start chat button
    // Start listening for messages
    listenForMessages();
  } else {
    chatLink.innerText = data.message;
  }
}

async function sendMessage() {
  const messageInput = document.getElementById('chat-message');
  const message = messageInput.value;
  const username = document.getElementById('chat-username').value;

  if (message && webhookUrl) {
    // Send message to Discord using the new endpoint
    await fetch('http://192.168.1.1/send-message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message, // Message content
        username, // User's username
        channelId, // Channel ID
      }),
    });

    messageInput.value = ''; // Clear input after sending
  }
}

function listenForMessages() {
  const chatMessages = document.getElementById('chat-messages');
  
  // Polling function to check for new messages (for demo purposes)
  pollingIntervalId = setInterval(async () => {
    const response = await fetch(`http://192.168.1.1/get-messages?channelId=${channelId}`);
    
    // Handle 404 error when the channel is not found
    if (response.status === 404) {
      clearInterval(pollingIntervalId); // Stop polling
      chatMessages.innerHTML = '<div class="message">The chat channel has been deleted or does not exist.</div>'; // Notify user
      return;
    }

    // Check if the response is okay
    if (!response.ok) {
      // Optional: Handle other potential errors
      console.error('Error fetching messages:', response.statusText);
      return;
    }

    const data = await response.json();
    
    // Clear previous messages
    chatMessages.innerHTML = '';

    // Append new messages if data.messages exists
    if (data.messages) {
      data.messages.forEach(msg => {
        const messageElement = document.createElement('div');
        messageElement.classList.add('message');
        messageElement.innerText = `${msg.author}: ${msg.content}`; // Display the message with the author's username
        chatMessages.appendChild(messageElement);
      });
    }

    // Scroll to the bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }, 2000); // Adjust polling interval as needed
}
// Function to handle closing the chat and deleting the channel
async function closeChat() {
  const confirmClose = confirm("Do you want to close the chat? This will delete the chat channel.");
  if (confirmClose) {
    try {
      await fetch(`http://192.168.1.1/delete-channel/${channelId}`, { method: 'DELETE' }); // Call the delete channel API
      toggleChat(); // Hide chat window
      alert("Chat channel deleted successfully.");
    } catch (error) {
      console.error('Error deleting chat channel:', error);
      alert("Failed to delete chat channel.");
    }
  }
}

// Hook up the close chat function to the X button
document.querySelector('.close').onclick = closeChat; // Assuming the X button has the class 'close'
