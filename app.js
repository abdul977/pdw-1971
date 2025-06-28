// Main application JavaScript - Progressive Web App implementation
// This class handles all PWA functionality including offline capabilities, background sync, and installation
class PWAApp {
    constructor() {
        // Track online/offline status using browser's navigator.onLine property
        this.isOnline = navigator.onLine;
        // Array to store form submissions that need to be synced when back online
        this.pendingSyncItems = [];
        // Store the PWA install prompt event for later use
        this.deferredPrompt = null;

        // Initialize the application
        this.init();
    }

    // Initialize all PWA features and components
    init() {
        this.registerServiceWorker();    // Register service worker for offline functionality
        this.setupEventListeners();     // Set up all DOM event listeners
        this.updateOnlineStatus();      // Update UI to show current online status
        this.loadPendingSyncItems();    // Load any pending sync items from localStorage
        this.setupPWAInstall();         // Set up PWA installation functionality
        this.loadCachedData();          // Load initial cached content
    }

    // Service Worker Registration - enables offline functionality and caching
    async registerServiceWorker() {
        // Check if service workers are supported in this browser
        if ('serviceWorker' in navigator) {
            try {
                // Register the service worker file (sw.js)
                const registration = await navigator.serviceWorker.register('sw.js');
                console.log('Service Worker registered successfully:', registration);

                // Listen for service worker updates (new versions of the app)
                registration.addEventListener('updatefound', () => {
                    // Get reference to the new service worker being installed
                    const newWorker = registration.installing;
                    // Listen for state changes in the new service worker
                    newWorker.addEventListener('statechange', () => {
                        // If new worker is installed and there's already a controller (old version)
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            // Notify user that a new version is available
                            this.showNotification('New version available! Refresh to update.', 'info');
                        }
                    });
                });
            } catch (error) {
                // Log any errors during service worker registration
                console.error('Service Worker registration failed:', error);
            }
        }
    }

    // Event Listeners Setup - bind all UI interactions and browser events
    setupEventListeners() {
        // Online/Offline status detection - listen for browser connectivity changes
        window.addEventListener('online', () => this.handleOnlineStatusChange(true));
        window.addEventListener('offline', () => this.handleOnlineStatusChange(false));

        // Demo buttons - bind click events to demonstration features
        document.getElementById('load-cached-data').addEventListener('click', () => this.loadCachedData());
        document.getElementById('fetch-data').addEventListener('click', () => this.fetchApiData());
        document.getElementById('force-sync').addEventListener('click', () => this.forceSync());

        // Offline form submission - handle form data when offline
        document.getElementById('offline-form').addEventListener('submit', (e) => this.handleOfflineForm(e));

        // Notification close button - allow users to dismiss notifications
        document.getElementById('notification-close').addEventListener('click', () => this.hideNotification());

        // Service Worker messages - listen for messages from the service worker
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.addEventListener('message', (event) => {
                this.handleServiceWorkerMessage(event);
            });
        }
    }

    // PWA Installation - handle the "Add to Home Screen" functionality
    setupPWAInstall() {
        // Listen for the browser's install prompt event
        window.addEventListener('beforeinstallprompt', (e) => {
            // Prevent the default browser install prompt from showing immediately
            e.preventDefault();
            // Store the event so we can trigger it later with our custom button
            this.deferredPrompt = e;
            // Show our custom install button
            document.getElementById('install-btn').style.display = 'block';
        });

        // Handle custom install button click
        document.getElementById('install-btn').addEventListener('click', async () => {
            // Check if we have a stored install prompt
            if (this.deferredPrompt) {
                // Show the browser's install prompt
                this.deferredPrompt.prompt();
                // Wait for user's choice (accept or dismiss)
                const { outcome } = await this.deferredPrompt.userChoice;
                console.log(`User response to the install prompt: ${outcome}`);
                // Clear the stored prompt and hide the install button
                this.deferredPrompt = null;
                document.getElementById('install-btn').style.display = 'none';
            }
        });

        // Listen for successful app installation
        window.addEventListener('appinstalled', () => {
            // Show success notification
            this.showNotification('PWA installed successfully!', 'success');
            // Clear the deferred prompt
            this.deferredPrompt = null;
        });
    }

    // Online/Offline Status Management - handle connectivity changes
    handleOnlineStatusChange(isOnline) {
        // Update internal online status
        this.isOnline = isOnline;
        // Update the UI to reflect current status
        this.updateOnlineStatus();

        if (isOnline) {
            // When back online, notify user and attempt to sync pending data
            this.showNotification('Back online! Syncing data...', 'success');
            this.syncPendingItems();
        } else {
            // When offline, warn user about limited functionality
            this.showNotification('You are offline. Some features may be limited.', 'warning');
        }
    }

    // Update the UI element that shows online/offline status
    updateOnlineStatus() {
        const statusElement = document.getElementById('online-status');
        // Update text content based on current status
        statusElement.textContent = this.isOnline ? 'Online' : 'Offline';
        // Update CSS class for styling (green for online, red for offline)
        statusElement.className = `status ${this.isOnline ? 'online' : 'offline'}`;
    }

    // Cached Data Demo - demonstrates loading content from browser cache
    async loadCachedData() {
        // Show loading spinner to indicate data is being processed
        this.showLoading(true);

        try {
            // Simulate network delay to demonstrate loading state
            await this.delay(1000);

            // Create mock cached data object with metadata
            const cachedData = {
                title: "Cached Article",
                content: "This content is cached and available offline. It was stored in the browser's cache when you first visited this page.",
                timestamp: new Date().toLocaleString(),  // Current timestamp for display
                source: "Cache"  // Indicate this data came from cache
            };

            // Display the cached content in the designated UI element
            this.displayContent('cached-content', cachedData);
        } catch (error) {
            // Log any errors that occur during cache loading
            console.error('Error loading cached data:', error);
        } finally {
            // Always hide loading spinner, regardless of success or failure
            this.showLoading(false);
        }
    }

    // API Data with Offline Fallback - demonstrates network-first, cache-fallback strategy
    async fetchApiData() {
        // Show loading indicator while fetching data
        this.showLoading(true);

        try {
            let data;

            // Check if we're online before attempting API call
            if (this.isOnline) {
                // Try to fetch from API first (network-first strategy)
                try {
                    // Fetch random quote from external API
                    const response = await fetch('https://api.quotable.io/random');
                    if (response.ok) {
                        // Parse JSON response from API
                        const quote = await response.json();
                        // Format the API data for display
                        data = {
                            title: "Random Quote",
                            content: `"${quote.content}" - ${quote.author}`,
                            timestamp: new Date().toLocaleString(),
                            source: "API"  // Indicate this is fresh data from API
                        };

                        // Cache the fresh data for offline use
                        localStorage.setItem('lastQuote', JSON.stringify(data));
                    } else {
                        // If API response is not OK, throw error to trigger fallback
                        throw new Error('API request failed');
                    }
                } catch (apiError) {
                    // If API fails, fall back to cached data
                    console.log('API failed, using cached data');
                    data = this.getCachedQuote();
                }
            } else {
                // If offline, immediately use cached data
                data = this.getCachedQuote();
            }

            // Display the data (either from API or cache)
            this.displayContent('api-content', data);
        } catch (error) {
            // Handle any unexpected errors
            console.error('Error fetching data:', error);
            // Display error message to user
            this.displayContent('api-content', {
                title: "Error",
                content: "Unable to load data. Please try again later.",
                timestamp: new Date().toLocaleString(),
                source: "Error"
            });
        } finally {
            // Always hide loading indicator
            this.showLoading(false);
        }
    }

    // Get cached quote data from localStorage or return default quote
    getCachedQuote() {
        // Try to retrieve previously cached quote from localStorage
        const cached = localStorage.getItem('lastQuote');
        if (cached) {
            // Parse the cached JSON data
            const data = JSON.parse(cached);
            // Update source to indicate this is cached data
            data.source = "Cache (Offline)";
            return data;
        }

        // If no cached data exists, return a default inspirational quote
        return {
            title: "Offline Quote",
            content: "\"The best way to predict the future is to create it.\" - Peter Drucker",
            timestamp: new Date().toLocaleString(),
            source: "Default (Offline)"
        };
    }

    // Offline Form Handling - capture form submissions when offline for later sync
    async handleOfflineForm(event) {
        // Prevent default form submission to handle it programmatically
        event.preventDefault();

        // Extract form data and create structured object for storage/submission
        const formData = {
            name: document.getElementById('name').value,        // User's name from form
            message: document.getElementById('message').value,  // User's message from form
            timestamp: new Date().toISOString(),              // ISO timestamp for sorting/tracking
            id: Date.now().toString()                         // Unique ID for tracking sync status
        };

        if (this.isOnline) {
            // If online, try to submit immediately to the server
            try {
                await this.submitFormData(formData);
                // Show success message and clear form
                this.showFormStatus('Form submitted successfully!', 'success');
                event.target.reset();
            } catch (error) {
                // If submission fails even when online, save for later sync
                this.addToPendingSync(formData);
                this.showFormStatus('Saved for sync when online', 'info');
                event.target.reset();
            }
        } else {
            // If offline, immediately save for later sync
            this.addToPendingSync(formData);
            this.showFormStatus('Saved offline - will sync when online', 'info');
            event.target.reset();
        }
    }

    // Simulate API submission - in real app this would be actual server endpoint
    async submitFormData(data) {
        // Simulate network delay
        await this.delay(1000);

        // In a real app, you would submit to your API endpoint
        console.log('Submitting form data:', data);

        // Simulate occasional failures for demonstration purposes
        if (Math.random() < 0.3) {
            throw new Error('Simulated API failure');
        }

        // Return success response
        return { success: true };
    }

    // Background Sync Management - handle queuing and syncing of offline data
    addToPendingSync(data) {
        // Add the data to our pending sync queue
        this.pendingSyncItems.push(data);
        // Persist the queue to localStorage so it survives page reloads
        this.savePendingSyncItems();
        // Update the UI to show current pending count
        this.updateSyncStatus();

        // Register background sync if supported by browser and service worker
        if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
            navigator.serviceWorker.ready.then(registration => {
                // Register a background sync event - this will trigger when connectivity returns
                return registration.sync.register('background-sync');
            });
        }
    }

    // Sync all pending items when connectivity is restored
    async syncPendingItems() {
        // Exit early if no items to sync
        if (this.pendingSyncItems.length === 0) return;

        // Create a copy of items to sync (avoid modifying array during iteration)
        const itemsToSync = [...this.pendingSyncItems];
        const syncLog = document.getElementById('sync-log');

        // Attempt to sync each pending item
        for (const item of itemsToSync) {
            try {
                // Try to submit the item to the server
                await this.submitFormData(item);
                // Remove successfully synced item from pending queue
                this.pendingSyncItems = this.pendingSyncItems.filter(i => i.id !== item.id);
                // Log successful sync with truncated message for display
                this.addToSyncLog(`✅ Synced: ${item.name} - ${item.message.substring(0, 30)}...`);
            } catch (error) {
                // Log failed sync attempt (item remains in queue for retry)
                this.addToSyncLog(`❌ Failed: ${item.name} - ${error.message}`);
            }
        }

        // Save updated pending items list and refresh UI
        this.savePendingSyncItems();
        this.updateSyncStatus();

        // Show success notification if all items were synced
        if (this.pendingSyncItems.length === 0) {
            this.showNotification('All items synced successfully!', 'success');
        }
    }

    // Force sync button handler - manually trigger sync when online
    forceSync() {
        if (this.isOnline) {
            // Only attempt sync if we're online
            this.syncPendingItems();
        } else {
            // Show error if user tries to sync while offline
            this.showNotification('Cannot sync while offline', 'error');
        }
    }

    // Utility Methods - helper functions for UI updates and data management

    // Display content in a standardized format with title, content, and metadata
    displayContent(elementId, data) {
        const element = document.getElementById(elementId);
        // Create HTML structure with title, content, and source information
        element.innerHTML = `
            <h4>${data.title}</h4>
            <p>${data.content}</p>
            <small>Source: ${data.source} | ${data.timestamp}</small>
        `;
    }

    // Show temporary status message for form submissions
    showFormStatus(message, type) {
        const statusElement = document.getElementById('form-status');
        // Set message text and apply appropriate CSS class for styling
        statusElement.textContent = message;
        statusElement.className = `status-message ${type}`;

        // Auto-hide the status message after 5 seconds
        setTimeout(() => {
            statusElement.textContent = '';
            statusElement.className = 'status-message';
        }, 5000);
    }

    // Update the UI counter showing number of pending sync items
    updateSyncStatus() {
        document.getElementById('pending-count').textContent = this.pendingSyncItems.length;
    }

    // Add a timestamped message to the sync log for debugging/monitoring
    addToSyncLog(message) {
        const syncLog = document.getElementById('sync-log');
        const timestamp = new Date().toLocaleTimeString();
        // Append new log entry with timestamp
        syncLog.innerHTML += `<div>[${timestamp}] ${message}</div>`;
        // Auto-scroll to show latest log entry
        syncLog.scrollTop = syncLog.scrollHeight;
    }

    // Persist pending sync items to localStorage for persistence across page reloads
    savePendingSyncItems() {
        localStorage.setItem('pendingSyncItems', JSON.stringify(this.pendingSyncItems));
    }

    // Load previously saved pending sync items from localStorage on app startup
    loadPendingSyncItems() {
        const saved = localStorage.getItem('pendingSyncItems');
        if (saved) {
            // Parse saved JSON data and update UI counter
            this.pendingSyncItems = JSON.parse(saved);
            this.updateSyncStatus();
        }
    }

    // Show notification banner with auto-hide functionality
    showNotification(message, type = 'info') {
        const notification = document.getElementById('notification');
        const text = document.getElementById('notification-text');

        // Set notification text and apply styling based on type (success, error, info, warning)
        text.textContent = message;
        notification.className = `notification ${type}`;
        notification.style.display = 'flex';

        // Auto-hide notification after 5 seconds
        setTimeout(() => this.hideNotification(), 5000);
    }

    // Hide the notification banner
    hideNotification() {
        document.getElementById('notification').style.display = 'none';
    }

    // Show/hide loading spinner overlay
    showLoading(show) {
        document.getElementById('loading').style.display = show ? 'flex' : 'none';
    }

    // Handle messages received from the service worker
    handleServiceWorkerMessage(event) {
        // Extract message type and payload from service worker
        const { type, payload } = event.data;

        // Handle different types of service worker messages
        switch (type) {
            case 'SYNC_COMPLETE':
                // Background sync completed successfully
                this.showNotification('Background sync completed!', 'success');
                break;
            case 'CACHE_UPDATED':
                // App files have been updated and cached
                this.showNotification('App updated and cached!', 'info');
                break;
        }
    }

    // Utility function to create delays for simulating network operations
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Initialize the app when DOM is loaded - ensures all HTML elements are available
document.addEventListener('DOMContentLoaded', () => {
    new PWAApp();
});

// Handle service worker updates - reload page when new service worker takes control
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('controllerchange', () => {
        // Reload the page to use the new service worker
        window.location.reload();
    });
}
