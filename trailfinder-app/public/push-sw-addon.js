// TrailHub – Push Notification Service Worker Addon
// Imported by the Workbox-generated SW via importScripts.
// Handles Web Push events and notification clicks.

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    return;
  }

  const {
    title = 'TrailHub',
    body  = '',
    icon  = '/icons/icon-192.png',
    badge = '/icons/icon-96.png',
    data  = {},
  } = payload;

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon,
      badge,
      data,
      vibrate:  [100, 50, 100],
      tag:      data.type || 'trailhub-general',
      renotify: true,
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        // Focus an existing tab on the same origin if possible
        for (const client of windowClients) {
          if (client.url.startsWith(self.location.origin) && 'focus' in client) {
            client.focus();
            if ('navigate' in client) client.navigate(targetUrl);
            return;
          }
        }
        // Otherwise open a new tab
        if (clients.openWindow) return clients.openWindow(targetUrl);
      })
  );
});
