/**
 * Tenth's Global Notification & Ascension Engine
 * Handles premium glassmorphic toast notifications with mountain/peak metaphors.
 */

class TenthsNotifier {
    constructor() {
        this.container = null;
        this.init();
    }

    init() {
        // Create container if it doesn't exist
        if (!document.getElementById('tenths-notifier-container')) {
            this.container = document.createElement('div');
            this.container.id = 'tenths-notifier-container';
            this.container.className = 'tenths-notifier-container';
            document.body.appendChild(this.container);
            this.addStyles();
        } else {
            this.container = document.getElementById('tenths-notifier-container');
        }
    }

    addStyles() {
        if (document.getElementById('tenths-notifier-styles')) return;

        const styles = `
            .tenths-notifier-container {
                position: fixed;
                bottom: 30px;
                left: 50%;
                transform: translateX(-50%);
                z-index: 9999;
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 12px;
                pointer-events: none;
            }

            .tenths-toast {
                background: rgba(255, 255, 255, 0.7);
                backdrop-filter: blur(12px) saturate(180%);
                -webkit-backdrop-filter: blur(12px) saturate(180%);
                border: 1px solid rgba(255, 255, 255, 0.3);
                border-radius: 12px;
                padding: 12px 24px;
                color: #4A3728;
                font-family: 'Outfit', sans-serif;
                font-size: 0.95rem;
                font-weight: 500;
                box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.15);
                display: flex;
                align-items: center;
                gap: 12px;
                transform: translateY(20px);
                opacity: 0;
                transition: all 0.5s cubic-bezier(0.19, 1, 0.22, 1);
                pointer-events: auto;
                max-width: 400px;
                text-align: center;
            }

            .tenths-toast.show {
                transform: translateY(0);
                opacity: 1;
            }

            .tenths-toast-icon {
                font-size: 1.2rem;
            }

            .dark-mode .tenths-toast {
                background: rgba(30, 30, 30, 0.7);
                color: #E0D6CC;
                border: 1px solid rgba(255, 255, 255, 0.1);
                box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.4);
            }
        `;

        const styleSheet = document.createElement("style");
        styleSheet.id = 'tenths-notifier-styles';
        styleSheet.innerText = styles;
        document.head.appendChild(styleSheet);
    }

    /**
     * Show a premium toast notification
     * @param {string} message - The inspiring message
     * @param {string} icon - Emoji or icon class
     */
    show(message, icon = '🏔️') {
        const toast = document.createElement('div');
        toast.className = 'tenths-toast';
        
        // Detect dark mode from body or html
        if (document.body.classList.contains('dark-mode') || document.documentElement.getAttribute('data-theme') === 'dark') {
            toast.classList.add('dark-mode-toast');
        }

        toast.innerHTML = `
            <span class="tenths-toast-icon">${icon}</span>
            <span class="tenths-toast-msg">${message}</span>
        `;

        this.container.appendChild(toast);

        // Trigger animation
        setTimeout(() => toast.classList.add('show'), 10);

        // Remove after duration
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 500);
        }, 4000);
    }

    // Semantic shorthands for the Ascension metaphor
    summit(msg = "Another summit conquered! You’re one step closer to the ultimate view.") {
        this.show(msg, '🏆');
    }

    peak(msg = "A new peak appears on the horizon. Ready for the climb?") {
        this.show(msg, '🏔️');
    }

    path(msg = "Your path has been realigned. Keep ascending.") {
        this.show(msg, '🧭');
    }
}

// Global instance
window.notifier = new TenthsNotifier();
