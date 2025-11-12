import express from 'express';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { CHANNEL } from './const.js';

const __filename = fileURLToPath( import.meta.url );
const __dirname = dirname( __filename );

const app = express();
const server = createServer( app );
const PORT = process.env.PORT || 3000;

// Set Content Security Policy headers - must be before static files
app.use( ( req, res, next ) => {
  // Remove any existing CSP headers first
  res.removeHeader( 'Content-Security-Policy' );
  res.removeHeader( 'Content-Security-Policy-Report-Only' );

  // Set the CSP header
  res.setHeader(
    'Content-Security-Policy',
    'media-src * blob: data:; ' +
    'default-src \'self\' \'unsafe-inline\' \'unsafe-eval\' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://commondatastorage.googleapis.com; ' +
    'script-src \'self\' \'unsafe-inline\' \'unsafe-eval\' https://cdn.jsdelivr.net; ' +
    'script-src-elem \'self\' \'unsafe-inline\' \'unsafe-eval\' https://cdn.jsdelivr.net; ' +
    'style-src \'self\' \'unsafe-inline\' https://cdnjs.cloudflare.com; ' +
    'connect-src ws: wss: http: https: api.open-meteo.com api.bigdatacloud.net; ' +
    'img-src * data: blob:; ' +
    'font-src * data: https://cdnjs.cloudflare.com;'
  );
  next();
} );

// Serve static files from public directory
// In production (dist), serve from dist/public, otherwise from public
const publicPath = __dirname.includes( 'dist' )
  ? join( __dirname, 'public' )
  : join( __dirname, '../public' );
app.use( express.static( publicPath ) );

// WebSocket server
const wss = new WebSocketServer( { server } );

// Store connected clients
const clients = new Set();

// Channel state management
const channelState = {
  channel_1: {
    type: CHANNEL.TYPE.VIDEO,
    metadata: {
      video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
      video_status: CHANNEL.STATUS.PLAYING
    }
  }
};

// Function to broadcast channel state to all clients
function broadcastChannelState( excludeWs = null ) {
  const payload = {
    channel_1: channelState.channel_1
  };

  clients.forEach( ( client ) => {
    if ( client !== excludeWs && client.readyState === 1 ) {
      client.send( JSON.stringify( payload ) );
    }
  } );
}

wss.on( 'connection', ( ws ) => {
  console.log( 'New client connected' );
  clients.add( ws );

  // Send initial channel state to new client
  ws.send( JSON.stringify( {
    channel_1: channelState.channel_1
  } ) );

  // Handle incoming messages
  ws.on( 'message', ( message ) => {
    try {
      const data = JSON.parse( message.toString() );
      console.log( 'data', data );

      // Handle channel commands (play/pause)
      if ( data.channel && data.command ) {
        if ( data.channel === 'channel_1' && ( data.command === 'play' || data.command === 'pause' ) ) {
          // Update channel state
          channelState.channel_1.metadata.video_status = data.command === 'play' ? CHANNEL.STATUS.PLAYING : CHANNEL.STATUS.PAUSED;

          // Broadcast updated state to all clients (including sender for confirmation)
          broadcastChannelState( ws );

          console.log( `Channel 1: Video ${ data.command }` );
        }
      } else {
        // For other message types, broadcast as before
        clients.forEach( ( client ) => {
          if ( client !== ws && client.readyState === 1 ) {
            client.send( JSON.stringify( {
              type: 'broadcast',
              data,
              timestamp: new Date().toISOString()
            } ) );
          }
        } );
      }
    } catch ( error ) {
      ws.send( JSON.stringify( {
        type: 'error',
        message: 'Invalid message format'
      } ) );
    }
  } );

  // Handle client disconnect
  ws.on( 'close', () => {
    clients.delete( ws );
  } );

  // Handle errors
  ws.on( 'error', ( error ) => {
    console.error( 'WebSocket error:', error );
  } );
} );

// Health check endpoint
app.get( '/health', ( req, res ) => {
  res.json( {
    status: 'ok',
    clients: clients.size,
    timestamp: new Date().toISOString()
  } );
} );

server.listen( PORT, () => {
  console.log( `Server running on http://localhost:${ PORT }` );
  console.log( 'WebSocket server ready' );
} );

export { app, server, wss, clients };
export default app;

