// custom.js
// Loaded on every blog page, before blog.js. Blog updates never touch this file.
//
// Add your own sidebar widget types here, then use them in blog/data/site.json
// (or the editor's Site tab) with  { "type": "nowPlaying", "title": "Now Playing" }.
//
//   window.pkWidgets = window.pkWidgets || {};
//   window.pkWidgets.nowPlaying = (widget, { site, posts }, body) => {
//       body.innerHTML = "<p>Some song — Some artist</p>";
//   };
//
// Run code once the sidebar and post lists are on the page:
//
//   document.addEventListener("pkblog:ready", (e) => {
//       console.log(`${e.detail.posts.length} posts`);
//   });
