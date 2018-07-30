/**
 * Suggest user to update the app as soon as new service worker is ready.
 */
const serviceWorkerUpdateReady = serviceWorker => {
  const notification = document.querySelector('.notification');
  const updateButton = notification.querySelector('.notification__button_type_update');
  const postponeButton = notification.querySelector('.notification__button_type_postpone');

  const focusedElementBeforeNotification = document.activeElement;
  const closeNotification = () => {
    notification.classList.remove('notification_visible');
    focusedElementBeforeNotification.focus();
  };

  notification.addEventListener('keydown', event => {
    const TAB = 9;
    const ESC = 27;
    if (event.keyCode === TAB) {
      if (event.shiftKey) {
        if (document.activeElement === updateButton) {
          event.preventDefault();
          postponeButton.focus();
        }
      } else {
        if (document.activeElement === postponeButton) {
          event.preventDefault();
          updateButton.focus();
        }
      }
    }
    if (event.keyCode === ESC) {
      closeNotification();
    }
  });

  notification.classList.add('notification_visible');
  updateButton.focus();

  updateButton.addEventListener('click', () => {
    if (serviceWorker.state === 'installed') {
      serviceWorker.postMessage({ action: 'skipWaiting' });
    }
  });

  postponeButton.addEventListener('click', closeNotification);

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    window.location.reload();
  });
};

/**
 * Track service worker installation process.
 */
const trackServiceWorkerInstalling = serviceWorker => {
  serviceWorker.addEventListener('statechange', () => {
    if (serviceWorker.state === 'installed') {
      serviceWorkerUpdateReady(serviceWorker);
    }
  });
};

/**
 * Register service worker.
 */
const registerServiceWorker = () => {
  if (!navigator.serviceWorker) {
    return;
  }

  window.addEventListener('load', async () => {
    const ONE_HOUR = 60 * 60 * 1000;

    try {
      const reg = await navigator.serviceWorker.register('/sw.js');

      setInterval(() => {
        reg.update();
      }, ONE_HOUR);

      if (!navigator.serviceWorker.controller) {
        return;
      }

      reg.addEventListener('updatefound', () => {
        trackServiceWorkerInstalling(reg.installing);
      });

      if (reg.installing) {
        trackServiceWorkerInstalling(reg.installing);
        return;
      }

      if (reg.waiting) {
        serviceWorkerUpdateReady(reg.waiting);
        return;
      }
    } catch (err) {
      console.error(err);
    }
  });
};

registerServiceWorker();
