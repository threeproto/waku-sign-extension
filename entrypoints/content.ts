export default defineContentScript({
  matches: ['*://*/*'],
  async main() {
    console.log('Hello content.');

    console.log("Injecting script...");
    await injectScript("/injected.js", {
      keepInDom: true,
    });
    console.log("Done!");

  },
});
