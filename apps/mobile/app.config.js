module.exports = {
  expo: {
    name: 'AloeVeraMate',
    slug: 'aloeveramate',
    version: '1.0.0',
    scheme: 'aloeveramate',
    orientation: 'portrait',
    icon: './assets/logo.jpeg',
    userInterfaceStyle: 'light',
    splash: {
      image: './assets/logo.jpeg',
      resizeMode: 'contain',
      backgroundColor: '#ffffff'
    },
    updates: {
      fallbackToCacheTimeout: 0
    },
    assetBundlePatterns: [
      '**/*'
    ],
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.aloeveramate.app'
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/logo.jpeg',
        backgroundColor: '#ffffff'
      },
      package: 'com.aloeveramate.app',
      permissions: ['CAMERA', 'READ_EXTERNAL_STORAGE', 'WRITE_EXTERNAL_STORAGE']
    },
    web: {
      favicon: './assets/logo.jpeg',
      bundler: 'metro'
    },
    plugins: [
      'expo-router',
      [
        'expo-camera',
        {
          cameraPermission: 'Allow AloeVeraMate to access your camera to capture plant images.'
        }
      ],
      [
        'expo-image-picker',
        {
          photosPermission: 'Allow AloeVeraMate to access your photos to select plant images.'
        }
      ]
    ],
    experiments: {
      typedRoutes: true
    },
    extra: {
      apiUrl: process.env.EXPO_PUBLIC_API_URL || 'http://192.168.8.194:8000'
    }
  }
};
