// Main application JavaScript
class PWAApp {
    constructor() {
        this.isOnline = navigator.onLine;
        this.pendingSyncItems = [];
        this.deferredPrompt = null;
        
        this.init();
    }

    init() {
        this.registerServiceWorker();
        this.setupEventListeners();
        this.updateOnlineStatus();
        this.loadPendingSyncItems();
        this.setupPWAInstall();
        this.loadCachedData();
    }

    // Service Worker Registration
    async registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.register('sw.js');
                console.log('Service Worker registered successfully:', registration);
                
                // Listen for service worker updates
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            this.showNotification('New version available! Refresh to update.', 'info');
                        }
                    });
                });
            } catch (error) {
                console.error('Service Worker registration failed:', error);
            }
        }
    }

    // Event Listeners Setup
    setupEventListeners() {
        // Online/Offline status
        window.addEventListener('online', () => this.handleOnlineStatusChange(true));
        window.addEventListener('offline', () => this.handleOnlineStatusChange(false));

        // Demo buttons
        document.getElementById('load-cached-data').addEventListener('click', () => this.loadCachedData());
        document.getElementById('fetch-data').addEventListener('click', () => this.fetchApiData());
        document.getElementById('force-sync').addEventListener('click', () => this.forceSync());

        // Offline form
        document.getElementById('offline-form').addEventListener('submit', (e) => this.handleOfflineForm(e));

        // Notification close
        document.getElementById('notification-close').addEventListener('click', () => this.hideNotification());

        // Service Worker messages
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.addEventListener('message', (event) => {
                this.handleServiceWorkerMessage(event);
            });
        }
    }

    // PWA Installation
    setupPWAInstall() {
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            this.deferredPrompt = e;
            document.getElementById('install-btn').style.display = 'block';
        });

        document.getElementById('install-btn').addEventListener('click', async () => {
            if (this.deferredPrompt) {
                this.deferredPrompt.prompt();
                const { outcome } = await this.deferredPrompt.userChoice;
                console.log(`User response to the install prompt: ${outcome}`);
                this.deferredPrompt = null;
                document.getElementById('install-btn').style.display = 'none';
            }
        });

        window.addEventListener('appinstalled', () => {
            this.showNotification('PWA installed successfully!', 'success');
            this.deferredPrompt = null;
        });
    }

    // Online/Offline Status Management
    handleOnlineStatusChange(isOnline) {
        this.isOnline = isOnline;
        this.updateOnlineStatus();
        
        if (isOnline) {
            this.showNotification('Back online! Syncing data...', 'success');
            this.syncPendingItems();
        } else {
            this.showNotification('You are offline. Some features may be limited.', 'warning');
        }
    }

    updateOnlineStatus() {
        const statusElement = document.getElementById('online-status');
        statusElement.textContent = this.isOnline ? 'Online' : 'Offline';
        statusElement.className = `status ${this.isOnline ? 'online' : 'offline'}`;
    }

    // Cached Data Demo
    async loadCachedData() {
        this.showLoading(true);
        
        try {
            // Simulate loading cached data
            await this.delay(1000);
            
            const cachedData = {
                title: "Cached Article",
                content: "This content is cached and available offline. It was stored in the browser's cache when you first visited this page.",
                timestamp: new Date().toLocaleString(),
                source: "Cache"
            };

            this.displayContent('cached-content', cachedData);
        } catch (error) {
            console.error('Error loading cached data:', error);
        } finally {
            this.showLoading(false);
        }
    }

    // API Data with Offline Fallback
    async fetchApiData() {
        this.showLoading(true);
        
        try {
            let data;
            
            if (this.isOnline) {
                // Try to fetch from API
                try {
                    const response = await fetch('https://api.quotable.io/random');
                    if (response.ok) {
                        const quote = await response.json();
                        data = {
                            title: "Random Quote",
                            content: `"${quote.content}" - ${quote.author}`,
                            timestamp: new Date().toLocaleString(),
                            source: "API"
                        };
                        
                        // Cache the data
                        localStorage.setItem('lastQuote', JSON.stringify(data));
                    } else {
                        throw new Error('API request failed');
                    }
                } catch (apiError) {
                    console.log('API failed, using cached data');
                    data = this.getCachedQuote();
                }
            } else {
                // Use cached data when offline
                data = this.getCachedQuote();
            }

            this.displayContent('api-content', data);
        } catch (error) {
            console.error('Error fetching data:', error);
            this.displayContent('api-content', {
                title: "Error",
                content: "Unable to load data. Please try again later.",
                timestamp: new Date().toLocaleString(),
                source: "Error"
            });
        } finally {
            this.showLoading(false);
        }
    }

    getCachedQuote() {
        const cached = localStorage.getItem('lastQuote');
        if (cached) {
            const data = JSON.parse(cached);
            data.source = "Cache (Offline)";
            return data;
        }
        
        return {
            title: "Offline Quote",
            content: "\"The best way to predict the future is to create it.\" - Peter Drucker",
            timestamp: new Date().toLocaleString(),
            source: "Default (Offline)"
        };
    }

    // Offline Form Handling
    async handleOfflineForm(event) {
        event.preventDefault();
        
        const formData = {
            name: document.getElementById('name').value,
            message: document.getElementById('message').value,
            timestamp: new Date().toISOString(),
            id: Date.now().toString()
        };

        if (this.isOnline) {
            // Try to submit immediately
            try {
                await this.submitFormData(formData);
                this.showFormStatus('Form submitted successfully!', 'success');
                event.target.reset();
            } catch (error) {
                this.addToPendingSync(formData);
                this.showFormStatus('Saved for sync when online', 'info');
                event.target.reset();
            }
        } else {
            // Save for later sync
            this.addToPendingSync(formData);
            this.showFormStatus('Saved offline - will sync when online', 'info');
            event.target.reset();
        }
    }

    async submitFormData(data) {
        // Simulate API submission
        await this.delay(1000);
        
        // In a real app, you would submit to your API
        console.log('Submitting form data:', data);
        
        // Simulate occasional failures for demo
        if (Math.random() < 0.3) {
            throw new Error('Simulated API failure');
        }
        
        return { success: true };
    }

    // Background Sync Management
    addToPendingSync(data) {
        this.pendingSyncItems.push(data);
        this.savePendingSyncItems();
        this.updateSyncStatus();
        
        // Register background sync if supported
        if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
            navigator.serviceWorker.ready.then(registration => {
                return registration.sync.register('background-sync');
            });
        }
    }

    async syncPendingItems() {
        if (this.pendingSyncItems.length === 0) return;
        
        const itemsToSync = [...this.pendingSyncItems];
        const syncLog = document.getElementById('sync-log');
        
        for (const item of itemsToSync) {
            try {
                await this.submitFormData(item);
                this.pendingSyncItems = this.pendingSyncItems.filter(i => i.id !== item.id);
                this.addToSyncLog(`✅ Synced: ${item.name} - ${item.message.substring(0, 30)}...`);
            } catch (error) {
                this.addToSyncLog(`❌ Failed: ${item.name} - ${error.message}`);
            }
        }
        
        this.savePendingSyncItems();
        this.updateSyncStatus();
        
        if (this.pendingSyncItems.length === 0) {
            this.showNotification('All items synced successfully!', 'success');
        }
    }

    forceSync() {
        if (this.isOnline) {
            this.syncPendingItems();
        } else {
            this.showNotification('Cannot sync while offline', 'error');
        }
    }

    // Utility Methods
    displayContent(elementId, data) {
        const element = document.getElementById(elementId);
        element.innerHTML = `
            <h4>${data.title}</h4>
            <p>${data.content}</p>
            <small>Source: ${data.source} | ${data.timestamp}</small>
        `;
    }

    showFormStatus(message, type) {
        const statusElement = document.getElementById('form-status');
        statusElement.textContent = message;
        statusElement.className = `status-message ${type}`;
        
        setTimeout(() => {
            statusElement.textContent = '';
            statusElement.className = 'status-message';
        }, 5000);
    }

    updateSyncStatus() {
        document.getElementById('pending-count').textContent = this.pendingSyncItems.length;
    }

    addToSyncLog(message) {
        const syncLog = document.getElementById('sync-log');
        const timestamp = new Date().toLocaleTimeString();
        syncLog.innerHTML += `<div>[${timestamp}] ${message}</div>`;
        syncLog.scrollTop = syncLog.scrollHeight;
    }

    savePendingSyncItems() {
        localStorage.setItem('pendingSyncItems', JSON.stringify(this.pendingSyncItems));
    }

    loadPendingSyncItems() {
        const saved = localStorage.getItem('pendingSyncItems');
        if (saved) {
            this.pendingSyncItems = JSON.parse(saved);
            this.updateSyncStatus();
        }
    }

    showNotification(message, type = 'info') {
        const notification = document.getElementById('notification');
        const text = document.getElementById('notification-text');
        
        text.textContent = message;
        notification.className = `notification ${type}`;
        notification.style.display = 'flex';
        
        setTimeout(() => this.hideNotification(), 5000);
    }

    hideNotification() {
        document.getElementById('notification').style.display = 'none';
    }

    showLoading(show) {
        document.getElementById('loading').style.display = show ? 'flex' : 'none';
    }

    handleServiceWorkerMessage(event) {
        const { type, payload } = event.data;
        
        switch (type) {
            case 'SYNC_COMPLETE':
                this.showNotification('Background sync completed!', 'success');
                break;
            case 'CACHE_UPDATED':
                this.showNotification('App updated and cached!', 'info');
                break;
        }
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new PWAApp();
});

// Handle service worker updates
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload();
    });
}
