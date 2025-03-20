import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  extensionApi: 'chrome',
  modules: ['@wxt-dev/module-react'],
  manifest: {
    host_permissions: [
      "<all_urls>",
    ],
    web_accessible_resources: [
      {
        resources: ["injected.js"],
        matches: ["*://*/*"],
      },
    ],
  },
  runner: {
    startUrls: ["https://metamask.github.io/test-dapp/"]
  }
});
