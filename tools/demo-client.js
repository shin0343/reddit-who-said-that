(() => {
  const candidate = new URLSearchParams(location.search).get('player') ?? '';
  const player = /^[a-z][a-z0-9_-]{0,23}$/i.test(candidate)
    ? candidate
    : 'alice';
  globalThis.devvit = { context: { subredditId: 't5_local-demo' } };
  const nativeFetch = window.fetch.bind(window);
  window.fetch = (input, options = {}) => {
    const url = new URL(
      input instanceof Request ? input.url : input,
      location.href
    );
    if (
      url.origin !== location.origin ||
      !url.pathname.startsWith('/api/wst/')
    ) {
      return nativeFetch(input, options);
    }
    const headers = new Headers(options.headers);
    headers.set('x-demo-player', player);
    return nativeFetch(input, { ...options, headers });
  };

  let channels = [];
  const emit = (status, channel, msg) =>
    window.postMessage(
      {
        type: 'devvit-message',
        data: { realtimeEvent: { status, event: { channel, data: { msg } } } },
      },
      location.origin
    );
  const stream = new EventSource('/demo-events');
  stream.onopen = () => channels.forEach((channel) => emit(0, channel));
  stream.onerror = () => channels.forEach((channel) => emit(1, channel));
  stream.onmessage = ({ data }) => {
    const { channel, message } = JSON.parse(data);
    if (channels.includes(channel)) emit(-1, channel, message);
  };
  addEventListener('message', ({ data, source }) => {
    if (source !== window || data?.type !== 'devvit-internal' || !data.realtime)
      return;
    const before = channels;
    channels = data.realtime.subscriptionIds ?? [];
    if (stream.readyState === EventSource.OPEN) {
      for (const channel of channels)
        if (!before.includes(channel)) emit(0, channel);
    }
  });
})();
