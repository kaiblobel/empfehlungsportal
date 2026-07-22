(function referralTracking() {
  'use strict';

  const token = new URLSearchParams(window.location.search).get('token') || '';
  const tokenPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!tokenPattern.test(token)) return;
  document.documentElement.setAttribute('data-referral-tracking', 'ready');

  function send(event) {
    const body = JSON.stringify({ token, event });
    const url = '/api/referral-event';
    try {
      if (navigator.sendBeacon) {
        const queued = navigator.sendBeacon(url, new Blob([body], { type: 'application/json' }));
        if (queued) return;
      }
    } catch (_) {}
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      credentials: 'same-origin',
      keepalive: true,
    }).catch(() => {});
  }

  window.ReferralTracking = { track: send };
  send('opened');

  document.addEventListener('click', function trackBookingClick(event) {
    const target = event.target.closest('[data-track-booking], [data-bb="booking"], #calendar-button');
    if (target) send('booking_started');
  }, true);
})();
