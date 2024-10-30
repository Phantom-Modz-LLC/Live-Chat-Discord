const express = require('express');
const cors = require('cors');
const { Client, GatewayIntentBits, ChannelType, WebhookClient } = require('discord.js');
const app = express();
const PORT = 6656;

// Discord bot setup
const discordToken = "";
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent, // Ensure this is enabled
  ],
});

// Constants for channel creation
const GUILD_ID = "";
const CATEGORY_ID = ""; // Removed "n" from the end

let webhookUrl; // Initialize webhookUrl variable

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
});

// Middleware
app.use(cors()); // Enable CORS
app.use(express.json()); // Enable JSON parsing

// Store messages temporarily for retrieval
let messageHistory = [];

// Endpoint to create a channel and a webhook
app.post('/start-chat', async (req, res) => {
  const username = req.body.username || 'User'; // Get the username from the request body
  const guild = await client.guilds.fetch(GUILD_ID); // Fetch the guild

  try {
    // Create a new text channel
    const channel = await guild.channels.create({
      name: `${username}-chat`, // Name the channel based on the username
      type: ChannelType.GuildText,
      parent: CATEGORY_ID,
      permissionOverwrites: [
        {
          id: guild.roles.everyone, // Hide the channel from everyone
          deny: ['ViewChannel'],
        },
      ],
    });

    console.log(`Created channel: ${channel.name} in category: ${CATEGORY_ID}`);

    // Create a webhook for the new channel
    const webhook = await channel.createWebhook({
      name: `${username}`, // Set the name here
      avatar: '', // Update this to a valid avatar URL
    });

    webhookUrl = webhook.url; // Set the webhookUrl to the newly created webhook's URL

    // Respond with the channel URL and webhook URL
    res.status(200).json({
      message: 'Chat started',
      channelUrl: `https://discord.com/channels/${GUILD_ID}/${channel.id}`,
      webhookUrl: webhook.url, // Send the webhook URL back to the client
      channelId: channel.id, // Send the channel ID back to the client
    });
  } catch (error) {
    console.error('Error creating chat:', error);
    res.status(500).json({ message: 'Error creating chat' });
  }
});

// Endpoint to get messages from a channel
app.get('/get-messages', async (req, res) => {
  const { channelId } = req.query; // Get the channelId from the query parameters

  if (!channelId) {
    return res.status(400).json({ message: 'Channel ID is required' });
  }

  try {
    // Attempt to fetch the channel
    const channel = await client.channels.fetch(channelId);
    
    // If channel doesn't exist, send a specific error message
    if (!channel || channel.type !== ChannelType.GuildText) {
      return res.status(404).json({ message: 'Channel not found or is not a text channel' });
    }

    // Fetch messages from the channel
    const messages = await channel.messages.fetch({ limit: 50 }); // Adjust the limit as needed

    // Format the messages for response
    const messageArray = messages.map(msg => ({
      content: msg.content,
      author: msg.author.username, // Include author username
    })); 

    // Update message history
    messageHistory = messageArray;

    // Return the messages
    res.status(200).json({ messages: messageArray });
  } catch (error) {
    // Handle error for unknown channel
    if (error.code === 10003) { // DiscordAPIError[10003]: Unknown Channel
      return res.status(404).json({ message: 'The chat channel has been deleted.' });
    }

    console.error('Error fetching messages:', error);
    res.status(500).json({ message: 'Error fetching messages' });
  }
});


// Listen for messages sent in the channel and send them to the client
client.on('messageCreate', async (message) => {
  if (message.channel.type === ChannelType.GuildText) {
    // If the message is from a staff member, send to the messageHistory
    if (message.author.bot === false) { // Assuming staff members are not bots
      const response = {
        content: message.content,
        author: message.author.username,
      };
      messageHistory.push(response);
      // You could emit this to connected clients via WebSocket or other means
      console.log(`Message from Discord: ${message.author.username}: ${message.content}`);
    }
  }
});

// Sample Express route to handle sending messages
app.post('/send-message', async (req, res) => {
  const { message, username } = req.body;

  // Send the message to Discord using the webhook
  const webhook = new WebhookClient({ url: webhookUrl });

  try {
    await webhook.send({
      content: message, // Send only the message content
      username: username, // Set the username for the webhook message
    });
    res.status(200).json({ message: 'Message sent' });
  } catch (error) {
    console.error('Error sending message to Discord:', error);
    res.status(500).json({ message: 'Error sending message' });
  }
});

// Endpoint to delete a channel
app.delete('/delete-channel/:channelId', async (req, res) => {
  const { channelId } = req.params; // Get the channel ID from the URL parameters

  try {
    const channel = await client.channels.fetch(channelId); // Fetch the channel

    if (!channel || channel.type !== ChannelType.GuildText) {
      return res.status(404).json({ message: 'Channel not found or is not a text channel' });
    }

    await channel.delete(); // Delete the channel
    res.status(200).json({ message: 'Channel deleted successfully' });
  } catch (error) {
    console.error('Error deleting channel:', error);
    res.status(500).json({ message: 'Error deleting channel' });
  }
});


// Start server and bot
client.login(discordToken);
app.listen(PORT, () => console.log(`Bot server running on port ${PORT}`));
