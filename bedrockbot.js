const bedrock = require('bedrock-protocol');

class MinecraftBot {
    constructor() {
        this.client = null;
        this.connected = false;
        this.playerData = {
            username: '',
            position: { x: 0, y: 0, z: 0 },
            health: 20,
            entityId: null
        };
        this.messageToggle = false; // For alternating between messages
    }

    // Generate random number between 1 and 60
    getRandomAfkNumber() {
        return Math.floor(Math.random() * 60) + 1;
    }

    // Send AFK command with message to elytrashulker and chat message
    sendAfkCommand() {
        if (!this.connected) return;
        
        const randomNum = this.getRandomAfkNumber();
        
        // Send the /afk command
        this.sendMessage(`/afk ${randomNum}`);
        
        // Send a chat message about going AFK
        setTimeout(() => {
            this.sendMessage(`Going AFK for ${randomNum} minutes! 💤`);
        }, 500); // Small delay to ensure commands are sent in order
        
        // Alternate between "Worked" and "perfect"
        const message = this.messageToggle ? "perfect" : "Worked";
        this.messageToggle = !this.messageToggle; // Toggle for next time
        
        // Send message to elytrashulker after a delay
        setTimeout(() => {
            this.sendMessage(`/msg elytrashulker ${message}`);
        }, 1000); // 1 second delay to ensure AFK command is processed first
        
        console.log(`⏰ Sent /afk ${randomNum}, chat message, and /msg elytrashulker ${message}`);
    }

    async connect(username = 'BotHelper') {
        try {
            console.log(`🌐 Connecting to DonutSMP as ${username}...`);
            
            this.client = bedrock.createClient({
                host: 'play.donutsmp.net',
                port: 19132,
                username: username,
                offline: false // Built-in Xbox authentication
            });

            this.playerData.username = username;
            this.setupEventHandlers();
            
        } catch (error) {
            console.error('❌ Connection failed:', error.message);
        }
    }

    setupEventHandlers() {
        // Connection successful
        this.client.on('spawn', () => {
            console.log('🎮 Successfully spawned in DonutSMP!');
            this.connected = true;
            
            // Send initial AFK command after spawn with random number
            setTimeout(() => {
                this.sendAfkCommand();
                console.log(`⏰ Initial AFK command sent`);
            }, 2000);
        });

        // Handle disconnection
        this.client.on('disconnect', (packet) => {
            console.log('🔌 Disconnected:', packet.message || 'Unknown reason');
            this.connected = false;
        });

        // Handle errors
        this.client.on('error', (error) => {
            console.error('❌ Client error:', error.message);
        });

        // Chat messages
        this.client.on('text', (packet) => {
            console.log(`💬 [${packet.type}] ${packet.source_name}: ${packet.message}`);
            this.handleChatCommand(packet);
        });

        // Position updates
        this.client.on('move_actor_absolute', (packet) => {
            if (packet.runtime_entity_id === this.playerData.entityId) {
                this.playerData.position = {
                    x: packet.position.x,
                    y: packet.position.y,
                    z: packet.position.z
                };
            }
        });

        // Health updates
        this.client.on('set_health', (packet) => {
            this.playerData.health = packet.health;
            console.log(`❤️ Health: ${this.playerData.health}/20`);
        });

        // Get entity ID when game starts
        this.client.on('start_game', (packet) => {
            console.log('🎯 Game started!');
            this.playerData.entityId = packet.runtime_entity_id;
            console.log(`🆔 Entity ID: ${this.playerData.entityId}`);
        });
    }

    handleChatCommand(packet) {
        const message = packet.message.toLowerCase();
        const sourceName = packet.source_name;
        
        // Ignore own messages
        if (sourceName === this.client.username) return;
        
        // Simple bot commands
        if (message.includes('!ping')) {
            this.sendMessage('🏓 Pong!');
        }
        
        if (message.includes('!help')) {
            this.sendMessage('🤖 Commands: !ping, !pos, !time, !health, !help');
        }
        
        if (message.includes('!pos')) {
            const pos = this.playerData.position;
            this.sendMessage(`📍 Position: ${pos.x.toFixed(1)}, ${pos.y.toFixed(1)}, ${pos.z.toFixed(1)}`);
        }
        
        if (message.includes('!time')) {
            this.sendMessage(`🕒 Time: ${new Date().toLocaleTimeString()}`);
        }
        
        if (message.includes('!health')) {
            this.sendMessage(`❤️ Health: ${this.playerData.health}/20`);
        }

        // Respond to greetings
        if (message.includes('hello bot') || message.includes('hi bot')) {
            this.sendMessage('👋 Hello there!');
        }
    }

    sendMessage(text) {
        if (!this.connected || !this.client) {
            console.log('❌ Cannot send message - not connected');
            return;
        }

        try {
            this.client.queue('text', {
                type: 'chat',
                needs_translation: false,
                source_name: this.client.username,
                xuid: '',
                platform_chat_id: '',
                filtered_message: '',
                message: text
            });
            
            console.log(`📤 Sent: ${text}`);
        } catch (error) {
            console.error('❌ Failed to send message:', error.message);
        }
    }

    // Get bot status
    getStatus() {
        return {
            connected: this.connected,
            username: this.playerData.username,
            position: this.playerData.position,
            health: this.playerData.health,
            entityId: this.playerData.entityId
        };
    }

    // Graceful disconnect
    disconnect() {
        if (this.client && this.connected) {
            console.log('👋 Disconnecting from server...');
            this.sendMessage('🤖 Bot going offline. Goodbye!');
            
            setTimeout(() => {
                this.client.disconnect();
                this.connected = false;
            }, 1000);
        }
    }
}

// Initialize and start the bot
async function startBot() {
    console.log('🚀 Starting DonutSMP Bot...');
    
    const bot = new MinecraftBot();
    
    // Connect with a username (change this to your preferred name)
    await bot.connect('BotHelper'); // Change this username as needed
    
    // Status updates every 60 seconds
    setInterval(() => {
        if (bot.connected) {
            const status = bot.getStatus();
            console.log(`📊 Status: ${status.username} | Health: ${status.health} | Pos: ${status.position.x.toFixed(1)}, ${status.position.y.toFixed(1)}, ${status.position.z.toFixed(1)}`);
        } else {
            console.log('⏸️ Bot is not connected');
        }
    }, 60000);
    
    // Auto AFK command every 20 minutes with random number 1-60
    setInterval(() => {
        if (bot.connected) {
            bot.sendAfkCommand();
        }
    }, 20 * 60 * 1000); // 20 minutes
    
    // Handle graceful shutdown
    process.on('SIGINT', () => {
        console.log('\n🛑 Shutting down bot...');
        bot.disconnect();
        setTimeout(() => process.exit(0), 2000);
    });
    
    // Auto-reconnect on unexpected disconnect
    bot.client?.on('disconnect', () => {
        console.log('🔄 Attempting to reconnect in 10 seconds...');
        setTimeout(async () => {
            if (!bot.connected) {
                try {
                    await bot.connect('BotHelper');
                } catch (error) {
                    console.error('❌ Reconnection failed:', error.message);
                }
            }
        }, 10000);
    });

    return bot;
}

// Export for use as module
module.exports = MinecraftBot;

// Run if executed directly
if (require.main === module) {
    startBot().catch(console.error);
}