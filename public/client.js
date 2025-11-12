function channelApp() {
  return {
    connected: false,
    ws: null,
    channel1Data: null,
    channel2Data: null,
    isSeeking: false,
    isSyncingFromServer: false,
    userHasInteracted: false,
    videoProgress: 0,
    videoDuration: 0,
    isDraggingProgress: false,

    init() {
      this.connect();
      if (this.channel1Data) {
        this.syncVideoFromServer();
      }
      // Load weather data from client
      this.loadWeatherData();
    },

    connect() {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}`;

      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.connected = true;
        console.log('Connected to WebSocket server');
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          // Check if this is channel data (has channel_1)
          if (data.channel_1) {
            this.handleChannelData(data);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      this.ws.onclose = () => {
        this.connected = false;
        console.log('Disconnected from server');
        // Attempt to reconnect after 3 seconds
        setTimeout(() => this.connect(), 3000);
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
    },

    handleChannelData(data) {
      // Update channel 1 (video)
      if (data.channel_1) {
        this.channel1Data = data.channel_1;
        this.syncVideoFromServer();
      }
    },

    async loadWeatherData() {
      let latitude = -32.9442; // Rosario default
      let longitude = -60.6505; // Rosario default
      let locationName = 'Rosario, Argentina';

      try {
        // Request geolocation permission with timeout
        const position = await Promise.race([
          new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
              reject(new Error('Geolocation not supported'));
              return;
            }
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: 5000,
              maximumAge: 0
            });
          }),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Timeout')), 5000)
          )
        ]);

        console.log('Position:', position);
        latitude = position.coords.latitude;
        longitude = position.coords.longitude;

        // Try to get location name using reverse geocoding
        try {
          const geoResponse = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=es`
          );
          if (geoResponse.ok) {
            const geoData = await geoResponse.json();
            if (geoData.city && geoData.countryName) {
              locationName = `${geoData.city}, ${geoData.countryName}`;
            } else if (geoData.locality) {
              locationName = geoData.locality;
            }
          }
        } catch (e) {
          // If reverse geocoding fails, use coordinates
          locationName = `${latitude.toFixed(2)}, ${longitude.toFixed(2)}`;
        }
      } catch (error) {
        console.log('Using default location (Rosario):', error.message);
        // Already set to Rosario defaults above
      }

      // Fetch weather data from Open-Meteo API
      try {
        const response = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true&hourly=relativehumidity_2m`
        );

        if (!response.ok) {
          throw new Error('Weather API request failed');
        }

        const weatherData = await response.json();

        // Map Open-Meteo data to our channel_2 format
        this.channel2Data = {
          type: 'weather',
          metadata: {
            temperature_celcius: Math.round(weatherData.current_weather.temperature),
            location: locationName,
            humidity: weatherData.hourly?.relativehumidity_2m?.[0] || 0
          }
        };
      } catch (error) {
        console.error('Error fetching weather data:', error);
        // Set default weather data if API fails
        this.channel2Data = {
          type: 'weather',
          metadata: {
            error_message: 'Weather data not available'
          }
        };
      }
    },

    syncVideoFromServer() {
      if (!this.$refs.videoElement || !this.channel1Data || this.isSeeking) {
        return;
      }

      this.isSyncingFromServer = true;
      const targetStatus = this.channel1Data.metadata.video_status;
      const currentStatus = this.$refs.videoElement.paused ? 'paused' : 'playing';

      // Only sync play/pause, not position
      if (targetStatus === 'playing' && currentStatus === 'paused') {
        this.$refs.videoElement.play().catch(err => {
          // Silently handle autoplay errors - user will need to click play
          if (err.name !== 'NotAllowedError') {
            console.error('Error playing video:', err);
          }
        });
      } else if (targetStatus === 'paused' && currentStatus === 'playing') {
        this.$refs.videoElement.pause();
      }

      // Update video source if URL changed
      if (this.$refs.videoElement.src !== this.channel1Data.metadata.video_url) {
        this.$refs.videoElement.src = this.channel1Data.metadata.video_url;
      }

      this.isSyncingFromServer = false;
    },

    onVideoLoaded() {
      // Update video duration
      if (this.$refs.videoElement) {
        this.videoDuration = this.$refs.videoElement.duration || 0;
      }
      // Sync initial state when video loads
      this.syncVideoFromServer();
    },

    onVideoTimeUpdate() {
      // Update progress bar only if not dragging
      if (!this.isDraggingProgress && this.$refs.videoElement && this.videoDuration > 0) {
        this.videoProgress = (this.$refs.videoElement.currentTime / this.videoDuration) * 100;
      }
    },

    onVideoPlayEvent() {
      // Only broadcast if not syncing from server
      if (!this.isSyncingFromServer && !this.isSeeking) {
        this.sendChannelCommand('channel_1', 'play');
      }
    },

    onVideoPauseEvent() {
      // Only broadcast if not syncing from server
      if (!this.isSyncingFromServer && !this.isSeeking) {
        this.sendChannelCommand('channel_1', 'pause');
      }
    },

    onVideoSeeking() {
      this.isSeeking = true;
    },

    onVideoSeeked() {
      // Small delay to ensure seeking is complete
      setTimeout(() => {
        this.isSeeking = false;
      }, 100);
    },

    toggleVideoPlayPause() {
      if (!this.$refs.videoElement || !this.connected) {
        return;
      }

      if (this.$refs.videoElement.paused) {
        this.$refs.videoElement.play().catch(err => {
          console.error('Error playing video:', err);
        });
      } else {
        this.$refs.videoElement.pause();
      }
    },

    seekBackward() {
      if (!this.$refs.videoElement || !this.connected) {
        return;
      }
      this.$refs.videoElement.currentTime = Math.max(0, this.$refs.videoElement.currentTime - 10);
    },

    seekForward() {
      if (!this.$refs.videoElement || !this.connected) {
        return;
      }
      this.$refs.videoElement.currentTime = Math.min(
        this.$refs.videoElement.duration,
        this.$refs.videoElement.currentTime + 10
      );
    },

    sendChannelCommand(channel, command) {
      if (!this.connected || !this.ws) {
        console.error('Not connected to WebSocket server');
        return;
      }

      const message = {
        channel: channel,
        command: command
      };
      console.log('Sending message:', message);

      this.ws.send(JSON.stringify(message));
    },

    onProgressInput(event) {
      if (!this.$refs.videoElement || !this.videoDuration) {
        return;
      }

      const percentage = parseFloat(event.target.value);
      const newTime = (percentage / 100) * this.videoDuration;

      this.isSeeking = true;
      this.$refs.videoElement.currentTime = newTime;
      this.videoProgress = percentage;
    },

    onProgressMouseDown() {
      this.isDraggingProgress = true;
      this.isSeeking = true;
    },

    onProgressMouseUp() {
      this.isDraggingProgress = false;
      // Small delay to ensure seeking is complete
      setTimeout(() => {
        this.isSeeking = false;
      }, 100);
    },

    onProgressTouchStart(event) {
      this.isDraggingProgress = true;
      this.isSeeking = true;
      // Prevent default to avoid scrolling
      event.preventDefault();
    },

    onProgressTouchMove(event) {
      if (!this.$refs.videoElement || !this.videoDuration) {
        return;
      }

      // Update progress while dragging on touch
      const input = event.target;
      const rect = input.getBoundingClientRect();
      const touch = event.touches[0];
      const touchX = touch.clientX - rect.left;
      const percentage = Math.max(0, Math.min(100, (touchX / rect.width) * 100));
      const newTime = (percentage / 100) * this.videoDuration;

      this.$refs.videoElement.currentTime = newTime;
      this.videoProgress = percentage;
      event.preventDefault();
    },

    onProgressTouchEnd(event) {
      this.isDraggingProgress = false;
      // Small delay to ensure seeking is complete
      setTimeout(() => {
        this.isSeeking = false;
      }, 100);
    },

    seekToPosition(event) {
      // Only seek if the click is not on the input range itself
      if (event.target.classList.contains('video-progress-input')) {
        return;
      }

      if (!this.$refs.videoElement || !this.videoDuration) {
        return;
      }

      const container = event.currentTarget;
      const rect = container.getBoundingClientRect();
      const clickX = event.clientX - rect.left;
      const percentage = (clickX / rect.width) * 100;
      const newTime = (percentage / 100) * this.videoDuration;

      this.isSeeking = true;
      this.$refs.videoElement.currentTime = newTime;
      this.videoProgress = percentage;

      setTimeout(() => {
        this.isSeeking = false;
      }, 100);
    },

    seekToPositionTouch(event) {
      // Only seek if the touch is not on the input range itself
      if (event.target.classList.contains('video-progress-input')) {
        return;
      }

      if (!this.$refs.videoElement || !this.videoDuration) {
        return;
      }

      const container = event.currentTarget;
      const rect = container.getBoundingClientRect();
      const touch = event.touches[0];
      const touchX = touch.clientX - rect.left;
      const percentage = (touchX / rect.width) * 100;
      const newTime = (percentage / 100) * this.videoDuration;

      this.isSeeking = true;
      this.$refs.videoElement.currentTime = newTime;
      this.videoProgress = percentage;

      setTimeout(() => {
        this.isSeeking = false;
      }, 100);
    }
  };
}

// Export for Vite build - use default export for IIFE format
export default channelApp;

