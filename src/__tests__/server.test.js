import request from 'supertest';
import { WebSocket } from 'ws';
import { server, app } from '../server.js';
import { CHANNEL } from '../const.js';

describe('Server', () => {
  describe('GET /health', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('clients');
      expect(response.body).toHaveProperty('timestamp');
    });
  });

  describe('Static files', () => {
    it('should serve index.html', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);

      expect(response.text).toContain('SIA Challenge 2025');
    });
  });

  describe('WebSocket Video Control', () => {
    let client1;
    let client2;
    let serverAddress;

    beforeAll(() => {
      // Get the actual server address (server is already listening)
      const address = server.address();
      if (address) {
        serverAddress = `ws://localhost:${address.port}`;
      } else {
        // If server is not listening yet, wait for it
        return new Promise((resolve) => {
          server.on('listening', () => {
            const addr = server.address();
            serverAddress = `ws://localhost:${addr.port}`;
            resolve();
          });
        });
      }
    });

    afterEach(async () => {
      // Close WebSocket connections
      if (client1 && client1.readyState === WebSocket.OPEN) {
        client1.close();
      }
      if (client2 && client2.readyState === WebSocket.OPEN) {
        client2.close();
      }
      // Wait a bit for connections to close
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    const waitForConnection = (ws) => {
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Connection timeout'));
        }, 5000);

        ws.on('open', () => {
          clearTimeout(timeout);
          resolve();
        });

        ws.on('error', (error) => {
          clearTimeout(timeout);
          reject(error);
        });
      });
    };


    it('should broadcast pause command to other clients', async () => {
      // Create two WebSocket clients
      client1 = new WebSocket(serverAddress);
      client2 = new WebSocket(serverAddress);

      // Set up message accumulators BEFORE connecting
      const client1Messages = [];
      const client2Messages = [];

      const messageHandler1 = (data) => {
        try {
          const message = JSON.parse(data.toString());
          if (message.channel_1) {
            client1Messages.push(message);
          }
        } catch (error) {
          // Ignore parse errors
        }
      };

      const messageHandler2 = (data) => {
        try {
          const message = JSON.parse(data.toString());
          if (message.channel_1) {
            client2Messages.push(message);
          }
        } catch (error) {
          // Ignore parse errors
        }
      };

      // Set up listeners before waiting for connection
      client1.on('message', messageHandler1);
      client2.on('message', messageHandler2);

      // Wait for both clients to connect
      await Promise.all([
        waitForConnection(client1),
        waitForConnection(client2)
      ]);

      // Wait a bit for initial messages to arrive
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify initial state messages were received
      expect(client1Messages.length).toBeGreaterThanOrEqual(1);
      expect(client2Messages.length).toBeGreaterThanOrEqual(1);

      const initialMessage1 = client1Messages[0];
      const initialMessage2 = client2Messages[0];

      // Verify initial state is PLAYING
      expect(initialMessage1.channel_1.metadata.video_status).toBe(CHANNEL.STATUS.PLAYING);
      expect(initialMessage2.channel_1.metadata.video_status).toBe(CHANNEL.STATUS.PLAYING);

      // Get message count before sending command
      const messageCountBefore = client2Messages.length;

      // Send pause command from client1
      const pauseCommand = {
        channel: 'channel_1',
        command: 'pause'
      };
      client1.send(JSON.stringify(pauseCommand));

      // Wait for client2 to receive the update (polling approach)
      let updateMessage = null;
      const maxWaitTime = 5000;
      const startTime = Date.now();
      
      while (!updateMessage && (Date.now() - startTime) < maxWaitTime) {
        if (client2Messages.length > messageCountBefore) {
          updateMessage = client2Messages[client2Messages.length - 1];
          break;
        }
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      // Remove the message handlers
      client1.off('message', messageHandler1);
      client2.off('message', messageHandler2);

      // Verify the update was received
      expect(updateMessage).not.toBeNull();
      expect(updateMessage).toHaveProperty('channel_1');
      expect(updateMessage.channel_1).toHaveProperty('metadata');
      expect(updateMessage.channel_1.metadata.video_status).toBe(CHANNEL.STATUS.PAUSED);
    });

    it('should handle 200 alternating play/pause commands between clients', async () => {
      // Create two WebSocket clients
      client1 = new WebSocket(serverAddress);
      client2 = new WebSocket(serverAddress);

      // Set up message listeners BEFORE connecting
      const client1Messages = [];
      const client2Messages = [];

      const messageHandler1 = (data) => {
        try {
          const message = JSON.parse(data.toString());
          if (message.channel_1) {
            client1Messages.push(message);
          }
        } catch (error) {
          // Ignore parse errors
        }
      };

      const messageHandler2 = (data) => {
        try {
          const message = JSON.parse(data.toString());
          if (message.channel_1) {
            client2Messages.push(message);
          }
        } catch (error) {
          // Ignore parse errors
        }
      };

      // Set up listeners before waiting for connection
      client1.on('message', messageHandler1);
      client2.on('message', messageHandler2);

      // Wait for both clients to connect
      await Promise.all([
        waitForConnection(client1),
        waitForConnection(client2)
      ]);

      // Wait a bit for initial messages to arrive
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify initial state messages were received
      expect(client1Messages.length).toBeGreaterThanOrEqual(1);
      expect(client2Messages.length).toBeGreaterThanOrEqual(1);

      const initialMessage1 = client1Messages[0];
      const initialMessage2 = client2Messages[0];

      // Verify both clients received the same initial state
      expect(initialMessage1.channel_1.metadata.video_status).toBe(initialMessage2.channel_1.metadata.video_status);
      
      const initialStatus = initialMessage1.channel_1.metadata.video_status;
      let currentStatus = initialStatus;
      const iterations = 200;

      // Perform 100 iterations of alternating commands
      for (let i = 0; i < iterations; i++) {
        // Determine which client sends the command (alternate between them)
        const sendingClient = i % 2 === 0 ? client1 : client2;
        const receivingMessages = i % 2 === 0 ? client2Messages : client1Messages;

        // Determine the opposite command
        const oppositeCommand = currentStatus === CHANNEL.STATUS.PLAYING ? 'pause' : 'play';
        const expectedNewStatus = oppositeCommand === 'pause' ? CHANNEL.STATUS.PAUSED : CHANNEL.STATUS.PLAYING;

        // Get current message count before sending
        const messageCountBefore = receivingMessages.length;

        // Send the command
        sendingClient.send(JSON.stringify({
          channel: 'channel_1',
          command: oppositeCommand
        }));
        
        // Small delay to ensure the message is sent before we start checking
        await new Promise(resolve => setTimeout(resolve, 5));

        // Wait for the receiving client to get the update with the expected status (with timeout)
        await new Promise((resolve, reject) => {
          let resolved = false;
          let checkInterval;
          
          const timeout = setTimeout(() => {
            if (!resolved) {
              resolved = true;
              if (checkInterval) clearInterval(checkInterval);
              const lastMessage = receivingMessages.length > 0 
                ? receivingMessages[receivingMessages.length - 1] 
                : null;
              const lastStatus = lastMessage ? lastMessage.channel_1.metadata.video_status : 'none';
              reject(new Error(
                `Timeout waiting for message ${i + 1}/${iterations}. ` +
                `Expected status: ${expectedNewStatus}, ` +
                `Last received status: ${lastStatus}, ` +
                `Current messages: ${receivingMessages.length}, ` +
                `Before: ${messageCountBefore}, ` +
                `Current tracked status: ${currentStatus}`
              ));
            }
          }, 2000);

          checkInterval = setInterval(() => {
            if (resolved) {
              clearInterval(checkInterval);
              return;
            }
            
            // Check all new messages since messageCountBefore
            for (let j = messageCountBefore; j < receivingMessages.length; j++) {
              const message = receivingMessages[j];
              if (message.channel_1 && 
                  message.channel_1.metadata && 
                  message.channel_1.metadata.video_status === expectedNewStatus) {
                resolved = true;
                clearInterval(checkInterval);
                clearTimeout(timeout);
                
                currentStatus = expectedNewStatus;
                resolve();
                return;
              }
            }
          }, 10);
        });
        
        // Small delay to ensure message processing is complete
        await new Promise(resolve => setTimeout(resolve, 5));
      }

      // Verify total messages received
      // Each client should receive: 1 initial + 100 updates = 101 messages
      expect(client1Messages.length).toBeGreaterThanOrEqual(iterations);
      expect(client2Messages.length).toBeGreaterThanOrEqual(iterations);

      // Verify final state consistency
      const finalMessage1 = client1Messages[client1Messages.length - 1];
      const finalMessage2 = client2Messages[client2Messages.length - 1];
      
      expect(finalMessage1.channel_1.metadata.video_status).toBe(finalMessage2.channel_1.metadata.video_status);
      
      // Remove the message handlers
      client1.off('message', messageHandler1);
      client2.off('message', messageHandler2);
      
      // Verify server is still running and responsive
      const healthResponse = await request(app).get('/health');
      expect(healthResponse.status).toBe(200);
      expect(healthResponse.body.status).toBe('ok');
    }, 60000); // 60 second timeout for 200 iterations (200 * 2s timeout + buffer)
  });
});

