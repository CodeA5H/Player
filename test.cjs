const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  page.on('console', msg => console.log('PAGE LOG:', msg.text()));

  await page.setContent(`
    <!DOCTYPE html>
    <html>
    <body>
      <div id="fetcher"></div>
      <script src="https://www.youtube.com/iframe_api"></script>
      <script>
        function onYouTubeIframeAPIReady() {
          const player = new YT.Player('fetcher', {
            playerVars: { controls: 0, autoplay: 0, origin: 'http://localhost:5173' },
            events: {
              onReady: (e) => {
                console.log("Ready, cueing playlist!");
                player.cuePlaylist({listType: 'playlist', list: 'PLWjSaV1b3y4swriysy_FsqTD1Vb2CPdlK'});
                
                setInterval(() => {
                  const ids = player.getPlaylist();
                  if (ids && ids.length > 0) {
                    console.log("SUCCESS! IDs:", ids.length);
                  }
                }, 500);
              },
              onStateChange: (e) => {
                console.log("State change:", e.data);
              },
              onError: (e) => console.log("Error:", e.data)
            }
          });
        }
      </script>
    </body>
    </html>
  `);

  await new Promise(r => setTimeout(r, 10000));
  await browser.close();
})();
