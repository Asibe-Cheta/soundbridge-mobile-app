const { withAndroidManifest } = require('@expo/config-plugins');

module.exports = withAndroidManifest(config => {
  if (!config.modResults) return config;

  const { manifest } = config.modResults;
  if (!manifest) return config;

  if (!manifest.$) manifest.$ = {};
  manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';

  if (!manifest['uses-permission']) {
    manifest['uses-permission'] = [];
  }

  const alreadyAdded = manifest['uses-permission'].some(
    p => p.$?.['android:name'] === 'com.google.android.gms.permission.AD_ID'
  );

  if (!alreadyAdded) {
    manifest['uses-permission'].push({
      $: {
        'android:name': 'com.google.android.gms.permission.AD_ID',
        'tools:node': 'remove',
      },
    });
  }

  return config;
});
