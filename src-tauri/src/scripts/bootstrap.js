// name:     bootstrap
// purpose:  create window.__whatspulse (config, error reporting, Tauri IPC bridge)
//           and polyfill HTML5 Notification to trigger native desktop notifications.
// depends:  window.__TAURI__ or window.__TAURI_INTERNALS__
(function () {
    'use strict';
    if (window.__whatspulse) {
        return;
    }

    var invoke = function (cmd, args) {
        try {
            if (window.__TAURI__ && window.__TAURI__.core && typeof window.__TAURI__.core.invoke === 'function') {
                return window.__TAURI__.core.invoke(cmd, args).catch(function (err) {
                    console.warn('[WhatsPulse IPC Error][' + cmd + ']', err);
                });
            } else if (window.__TAURI_INTERNALS__ && typeof window.__TAURI_INTERNALS__.invoke === 'function') {
                return window.__TAURI_INTERNALS__.invoke(cmd, args).catch(function (err) {
                    console.warn('[WhatsPulse IPC Error][' + cmd + ']', err);
                });
            }
        } catch (e) {
            console.error('[WhatsPulse IPC Exception]', e);
        }
        return Promise.resolve();
    };

    var api = {
        config: window.__whatspulseConfig || {},
        invoke: invoke,
        report: function (name, error) {
            var message = error && error.message ? error.message : String(error);
            console.warn('[WhatsPulse Script Error][' + name + ']', message);
            invoke('script_failed', { name: name, message: message });
        },
        log: function (message) {
            console.log('[WhatsPulse Client]', message);
            invoke('client_log', { message: String(message) });
        },
        bridge: {
            scriptFailed: function (name, message) {
                invoke('script_failed', { name: name, message: message });
            },
            log: function (message) {
                invoke('client_log', { message: String(message) });
            },
            connectionChanged: function (up) {
                invoke('connection_changed', { up: up });
            },
            openSettings: function () {
                invoke('open_settings');
            },
            openDirectChat: function () {
                invoke('open_direct_chat');
            },
            triggerPanicMode: function () {
                invoke('trigger_panic_mode');
            },
            retry: function () {
                invoke('retry_page');
            }
        }
    };
    window.__whatspulse = api;

    // Boss Key / Panic Mode listener in page (F12 or Ctrl+Shift+X)
    window.addEventListener('keydown', function (e) {
        if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && (e.key === 'X' || e.key === 'x'))) {
            e.preventDefault();
            invoke('trigger_panic_mode');
        }
    }, true);

    // Polyfill HTML5 Notification so WhatsApp Web notifications trigger native desktop alerts
    try {
        var activeNotifications = {};
        var notifSeq = 0;

        var CustomNotification = function (title, options) {
            options = options || {};
            var notif = this;
            var id = 'wp_notif_' + (++notifSeq);

            notif.id = id;
            notif.title = title;
            notif.body = options.body || '';
            notif.icon = options.icon || null;
            notif.tag = options.tag || null;
            notif.onclick = null;
            notif.onclose = null;
            notif.listeners = {};

            notif.addEventListener = function (type, listener) {
                if (typeof listener === 'function') {
                    notif.listeners[type] = notif.listeners[type] || [];
                    notif.listeners[type].push(listener);
                }
            };

            notif.removeEventListener = function (type, listener) {
                if (notif.listeners[type]) {
                    notif.listeners[type] = notif.listeners[type].filter(function (l) { return l !== listener; });
                }
            };

            notif.dispatchEvent = function (event) {
                var type = (event && event.type) || 'click';
                if (typeof notif['on' + type] === 'function') {
                    try { notif['on' + type](event); } catch (e) { console.error('[WhatsPulse Notif]', e); }
                }
                if (notif.listeners[type]) {
                    notif.listeners[type].forEach(function (l) {
                        try { l.call(notif, event); } catch (e) { console.error('[WhatsPulse Notif]', e); }
                    });
                }
                return true;
            };

            notif.close = function () {
                var evt = new Event('close');
                notif.dispatchEvent(evt);
                delete activeNotifications[id];
                if (notif.tag) delete activeNotifications[notif.tag];
            };

            activeNotifications[id] = notif;
            if (notif.tag) {
                activeNotifications[notif.tag] = notif;
            }
            if (title) {
                activeNotifications['title_' + title] = notif;
            }

            // Auto-clean old references after 5 minutes
            setTimeout(function () {
                delete activeNotifications[id];
            }, 300000);

            invoke('show_notification', {
                id: id,
                title: title,
                body: notif.body,
                icon: notif.icon,
                tag: notif.tag
            });
        };

        CustomNotification.permission = 'granted';
        CustomNotification.requestPermission = function () {
            return Promise.resolve('granted');
        };
        window.Notification = CustomNotification;

        // Called when user clicks a desktop notification
        window.__whatspulseTriggerNotificationClick = function (id, tag, title) {
            var notif = (id && activeNotifications[id]) ||
                        (tag && activeNotifications[tag]) ||
                        (title && activeNotifications['title_' + title]);

            if (notif) {
                try {
                    var clickEvt = new Event('click');
                    notif.dispatchEvent(clickEvt);
                } catch (e) {
                    console.error('[WhatsPulse Notif Click]', e);
                }
            }

            // Fallback: search and click chat in #pane-side by contact/chat name
            if (title) {
                try {
                    var cleanTitle = title.split(':')[0].trim();
                    var contactEl = document.querySelector('#pane-side [role="listitem"] span[title="' + cleanTitle + '"]') ||
                                    document.querySelector('#pane-side [role="listitem"] [title*="' + cleanTitle + '"]');
                    if (contactEl) {
                        var row = contactEl.closest('[role="listitem"]') || contactEl.closest('[role="row"]');
                        if (row) {
                            row.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
                            row.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
                            row.click();
                        }
                    }
                } catch (e) {
                    console.warn('[WhatsPulse Fallback Chat Open]', e);
                }
            }
        };
    } catch (e) {
        api.report('notification-polyfill', e);
    }

    // Title / unread count observer: monitors document.title for "(2) WhatsApp"
    try {
        var lastUnreadCount = 0;
        var checkUnreadTitle = function () {
            var match = document.title.match(/^\((\d+)\)/);
            var count = match ? parseInt(match[1], 10) : 0;
            if (count !== lastUnreadCount) {
                lastUnreadCount = count;
                invoke('update_unread_count', { count: count });
            }
        };

        var titleEl = document.querySelector('title');
        if (titleEl) {
            var titleObserver = new MutationObserver(checkUnreadTitle);
            titleObserver.observe(titleEl, { childList: true, characterData: true, subtree: true });
        } else {
            setInterval(checkUnreadTitle, 1000);
        }
    } catch (e) {
        api.report('unread-badge-observer', e);
    }
})();
