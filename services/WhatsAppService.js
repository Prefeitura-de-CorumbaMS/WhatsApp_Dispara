const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const fs = require('fs').promises;
const path = require('path');
const EventEmitter = require('events');
const WhatsAppSession = require('../models/WhatsAppSession');

class WhatsAppService extends EventEmitter {
  constructor() {
    super();
    this.client = null;
    this.qrCodeData = null;
    this.isConnected = false;
    this.sessionPath = path.join(__dirname, '..', 'sessions');
    this.sessionId = 'main-session';
    this.connectionAttempts = 0;
    this.maxRetries = parseInt(process.env.MAX_RETRIES) || 3;
    this.messageDelay = parseInt(process.env.MESSAGE_DELAY_MS) || 5000;
  }

  async initialize() {
    try {
      // Ensure session directory exists
      await this.ensureSessionDirectory();
      
      // Get or create session record
      let session = await WhatsAppSession.findOne({ sessionId: this.sessionId });
      if (!session) {
        session = new WhatsAppSession({ sessionId: this.sessionId });
        await session.save();
      }

      await this.connect();
    } catch (error) {
      console.error('WhatsApp Service initialization error:', error);
      this.emit('error', error);
    }
  }

  async ensureSessionDirectory() {
    try {
      await fs.access(this.sessionPath);
    } catch {
      await fs.mkdir(this.sessionPath, { recursive: true });
    }
  }

  async connect() {
    try {
      this.connectionAttempts++;
      
      // Update session status
      await WhatsAppSession.updateOne(
        { sessionId: this.sessionId },
        { 
          connectionStatus: 'connecting',
          connectionAttempts: this.connectionAttempts
        }
      );

      // Create WhatsApp client
      this.client = new Client({
        authStrategy: new LocalAuth({
          clientId: this.sessionId,
          dataPath: this.sessionPath
        }),
        puppeteer: {
          headless: true,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process',
            '--disable-gpu'
          ]
        }
      });

      // Handle QR code
      this.client.on('qr', async (qr) => {
        try {
          this.qrCodeData = await qrcode.toDataURL(qr);
          await WhatsAppSession.updateOne(
            { sessionId: this.sessionId },
            { 
              connectionStatus: 'qr_required',
              qrCode: this.qrCodeData
            }
          );
          this.emit('qr', this.qrCodeData);
          console.log('QR Code generated');
        } catch (error) {
          console.error('QR Code generation error:', error);
        }
      });

      // Handle ready state
      this.client.on('ready', async () => {
        this.isConnected = true;
        this.connectionAttempts = 0;
        this.qrCodeData = null;

        const info = this.client.info;
        const phoneNumber = info.wid.user;
        
        await WhatsAppSession.updateOne(
          { sessionId: this.sessionId },
          { 
            isConnected: true,
            connectionStatus: 'connected',
            lastConnected: new Date(),
            phoneNumber: phoneNumber,
            qrCode: null,
            errorMessage: null,
            connectionAttempts: 0
          }
        );

        this.emit('connected', {
          phoneNumber: phoneNumber,
          user: info
        });

        console.log('WhatsApp connected successfully');
      });

      // Handle disconnection
      this.client.on('disconnected', async (reason) => {
        this.isConnected = false;
        
        await WhatsAppSession.updateOne(
          { sessionId: this.sessionId },
          { 
            isConnected: false,
            connectionStatus: 'disconnected',
            lastDisconnected: new Date(),
            errorMessage: reason
          }
        );

        this.emit('disconnected', reason);
        console.log('WhatsApp disconnected:', reason);

        // Try to reconnect if not logged out
        if (reason !== 'LOGOUT' && this.connectionAttempts < this.maxRetries) {
          console.log('Attempting to reconnect...');
          setTimeout(() => this.connect(), 5000);
        }
      });

      // Handle authentication failure
      this.client.on('auth_failure', async (message) => {
        console.error('Authentication failure:', message);
        await this.handleConnectionError(new Error(message));
      });

      // Handle messages
      this.client.on('message', async (message) => {
        await this.handleMessages(message);
      });

      // Initialize client
      await this.client.initialize();

    } catch (error) {
      console.error('Connection error:', error);
      await this.handleConnectionError(error);
    }
  }

  // This method is no longer needed with whatsapp-web.js
  // Connection handling is done in the event listeners

  async handleConnectionError(error) {
    await WhatsAppSession.updateOne(
      { sessionId: this.sessionId },
      { 
        connectionStatus: 'error',
        errorMessage: error.message,
        lastDisconnected: new Date()
      }
    );

    this.emit('error', error);
  }

  async handleMessages(message) {
    // Handle incoming messages if needed
    console.log('Received message:', message.body);
    this.emit('message_received', message);
  }

  async sendMessage(to, message, options = {}) {
    if (!this.isConnected || !this.client) {
      throw new Error('WhatsApp not connected');
    }

    try {
      // Format phone number for WhatsApp
      const chatId = to.includes('@') ? to : `${to}@c.us`;
      
      let result;
      
      if (options.type === 'image' && options.media) {
        const media = MessageMedia.fromFilePath(options.media.url || options.media);
        result = await this.client.sendMessage(chatId, media, { caption: message });
      } else if (options.type === 'video' && options.media) {
        const media = MessageMedia.fromFilePath(options.media.url || options.media);
        result = await this.client.sendMessage(chatId, media, { caption: message });
      } else if (options.type === 'document' && options.media) {
        const media = MessageMedia.fromFilePath(options.media.url || options.media);
        result = await this.client.sendMessage(chatId, media, { 
          caption: message,
          sendMediaAsDocument: true
        });
      } else {
        result = await this.client.sendMessage(chatId, message);
      }
      
      // Add delay between messages to respect rate limits
      if (this.messageDelay > 0) {
        await new Promise(resolve => setTimeout(resolve, this.messageDelay));
      }

      return result;
    } catch (error) {
      console.error('Send message error:', error);
      throw error;
    }
  }

  async getContacts() {
    if (!this.isConnected || !this.client) {
      throw new Error('WhatsApp not connected');
    }

    try {
      const contacts = await this.client.getContacts();
      return contacts
        .filter(contact => contact.isMyContact && !contact.isGroup)
        .map(contact => ({
        id: contact.id._serialized,
        name: contact.name || contact.pushname || contact.id.user,
        phone: contact.id.user,
        isGroup: contact.isGroup,
        isMyContact: contact.isMyContact
      }));
    } catch (error) {
      console.error('Get contacts error:', error);
      throw error;
    }
  }

  async disconnect() {
    if (this.client) {
      await this.client.logout();
      await this.client.destroy();
      this.client = null;
    }

    this.isConnected = false;
    
    await WhatsAppSession.updateOne(
      { sessionId: this.sessionId },
      { 
        isConnected: false,
        connectionStatus: 'disconnected',
        lastDisconnected: new Date()
      }
    );

    this.emit('disconnected');
  }

  async getConnectionStatus() {
    const session = await WhatsAppSession.findOne({ sessionId: this.sessionId });
    return {
      isConnected: this.isConnected,
      qrCode: this.qrCodeData,
      status: session?.connectionStatus || 'disconnected',
      phoneNumber: session?.phoneNumber,
      lastConnected: session?.lastConnected,
      errorMessage: session?.errorMessage
    };
  }

  async getStatus() {
    // Este método é usado pelo middleware checkWhatsAppConnection
    // Retorna 'CONNECTED' quando o WhatsApp está conectado
    // ou 'DISCONNECTED' caso contrário
    return this.isConnected ? 'CONNECTED' : 'DISCONNECTED';
  }

  async restartConnection() {
    await this.disconnect();
    this.connectionAttempts = 0;
    await this.connect();
  }
}

module.exports = new WhatsAppService();
