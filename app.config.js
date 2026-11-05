// Push do Android (FCM V1): o google-services.json não fica no Git.
// No EAS ele vem do segredo de arquivo GOOGLE_SERVICES_JSON; local, da raiz do app.
module.exports = ({ config }) => ({
  ...config,
  android: {
    ...config.android,
    googleServicesFile: process.env.GOOGLE_SERVICES_JSON ?? './google-services.json',
  },
});
