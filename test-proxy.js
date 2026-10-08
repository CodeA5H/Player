fetch('https://api.allorigins.win/get?url=' + encodeURIComponent('https://www.youtube.com/playlist?list=PLWjSaV1b3y4swriysy_FsqTD1Vb2CPdlK'))
  .then(r => r.json())
  .then(data => {
    const html = data.contents;
    const matches = [...html.matchAll(/"videoId":"([a-zA-Z0-9_-]{11})"/g)].map(m => m[1]);
    console.log([...new Set(matches)].length, "IDs found!");
  });
