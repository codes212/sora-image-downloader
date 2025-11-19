(() => {
  const downloaded = new Set();
  const queue = [];

  function filenameFromUrl(url, index) {
    try {
      const u = new URL(url, location.href);
      const base = u.pathname.split('/').filter(Boolean).pop() || 'image';
      return `sora-${index}-${base}`;
    } catch (e) {
      return `sora-${index}.jpg`;
    }
  }

  // Enqueue image URLs we haven't seen yet
  function collectImageUrls() {
    const urls = new Set();

    // <img> elements
    document.querySelectorAll('img').forEach(img => {
      const src = img.currentSrc || img.src;
      if (src) urls.add(src);
    });

    // Optional: CSS background images (uncomment if needed)
    // document.querySelectorAll('*').forEach(el => {
    //   const bg = getComputedStyle(el).backgroundImage;
    //   const match = bg && bg.match(/url\("(.*?)"\)/);
    //   if (match && match[1]) urls.add(match[1]);
    // });

    urls.forEach(url => {
      if (!downloaded.has(url) && !queue.find(item => item.url === url)) {
        queue.push({ url, index: downloaded.size + queue.length + 1 });
      }
    });

    console.log(`[Sora Scraper] Queue size: ${queue.length}, downloaded: ${downloaded.size}`);
  }

  // Download one image from the queue at a time
  async function processQueueOnce() {
    if (!queue.length) return;

    const { url, index } = queue.shift();
    if (downloaded.has(url)) return;

    try {
      console.log(`[Sora Scraper] Fetching: ${url}`);
      const res = await fetch(url, { mode: 'cors' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filenameFromUrl(url, index);
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(blobUrl);

      downloaded.add(url);
      console.log(`[Sora Scraper] Downloaded #${downloaded.size}: ${url}`);
    } catch (err) {
      console.warn('[Sora Scraper] Failed to download', url, err);
    }
  }

  // Scroll down a bit
  function scrollOnce() {
    window.scrollTo(0, document.documentElement.scrollHeight);
  }

  let lastHeight = 0;
  let stagnantTicks = 0;

  // Interval: scroll + collect new image URLs
  window.soraScrollInterval = setInterval(() => {
    const currentHeight = document.documentElement.scrollHeight;
    scrollOnce();
    collectImageUrls();

    if (currentHeight === lastHeight) {
      stagnantTicks++;
      if (stagnantTicks >= 5) {
        console.log('[Sora Scraper] No more new content. Stopping scroll.');
        clearInterval(window.soraScrollInterval);
      }
    } else {
      stagnantTicks = 0;
      lastHeight = currentHeight;
    }
  }, 2000);

  // Interval: process download queue
  window.soraDownloadInterval = setInterval(processQueueOnce, 800); // ~1.25 images/sec

  console.log(
    '[Sora Scraper] Started.\n' +
    'Stop scrolling: clearInterval(window.soraScrollInterval)\n' +
    'Stop downloads: clearInterval(window.soraDownloadInterval)'
  );
})();
