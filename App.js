import React, { useEffect, useState } from 'react';
import { StatusBar, StyleSheet, Platform, View, useWindowDimensions } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { enableScreens } from 'react-native-screens';
import { AuthProvider } from './src/contexts/AuthContext';
import { DataProvider } from './src/contexts/DataContext';
import { ToastProvider } from './src/contexts/ToastContext';
import AppNavigator from './src/navigation/AppNavigator';

if (Platform.OS === 'web') {
  enableScreens(false);
}

export default function App() {
  const { width } = useWindowDimensions();
  const isMobileViewport = Platform.OS !== 'web' || width <= 520;

  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      // Ensure mobile viewport meta tag exists
      let viewportMeta = document.querySelector('meta[name="viewport"]');
      if (!viewportMeta) {
        viewportMeta = document.createElement('meta');
        viewportMeta.name = 'viewport';
        document.head.appendChild(viewportMeta);
      }
      viewportMeta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover';

      const styleId = 'malla-mata-web-styles';
      if (!document.getElementById(styleId)) {
        const linkGoogleFonts = document.createElement('link');
        linkGoogleFonts.rel = 'stylesheet';
        linkGoogleFonts.href = 'https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap';
        document.head.appendChild(linkGoogleFonts);

        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
          @font-face {
            font-family: 'Ionicons';
            src: url('https://cdn.jsdelivr.net/npm/react-native-vector-icons@10.0.0/Fonts/Ionicons.ttf') format('truetype');
          }
          * {
            box-sizing: border-box;
            -webkit-tap-highlight-color: transparent;
            font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          }
          html, body {
            height: 100% !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: radial-gradient(circle at 50% 10%, #450A0A 0%, #1A0505 50%, #0F0202 100%) !important;
            overflow-x: hidden !important;
          }
          #root {
            min-height: 100% !important;
            width: 100% !important;
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
            justify-content: center !important;
          }
          @media (max-width: 520px) {
            html, body, #root {
              background: #FFFDF7 !important;
              align-items: stretch !important;
              justify-content: flex-start !important;
              height: 100% !important;
              min-height: 100% !important;
            }
          }
          input, textarea, select {
            font-family: 'Plus Jakarta Sans', sans-serif !important;
          }
          /* Smooth custom scrollbars */
          ::-webkit-scrollbar {
            width: 6px;
            height: 6px;
          }
          ::-webkit-scrollbar-track {
            background: rgba(0, 0, 0, 0.05);
          }
          ::-webkit-scrollbar-thumb {
            background: rgba(220, 38, 38, 0.4);
            border-radius: 3px;
          }
          ::-webkit-scrollbar-thumb:hover {
            background: rgba(220, 38, 38, 0.7);
          }
        `;
        document.head.appendChild(style);
      }
    }
  }, []);

  return (
    <GestureHandlerRootView style={[styles.rootContainer, isMobileViewport && styles.mobileRootContainer]}>
      <SafeAreaProvider style={[styles.rootContainer, isMobileViewport && styles.mobileRootContainer]}>
        <ToastProvider>
          <AuthProvider>
            <DataProvider>
              <StatusBar barStyle="light-content" backgroundColor="#DC2626" />

              {/* Main App Container */}
              <View style={[styles.frameContainer, !isMobileViewport && styles.webDeviceFrame]}>
                {!isMobileViewport && (
                  <View style={styles.phoneNotchBar}>
                    <View style={styles.phoneIsland}>
                      <View style={styles.phoneCameraDot} />
                      <View style={styles.phoneSpeakerPill} />
                    </View>
                  </View>
                )}
                <View style={styles.navigatorWrapper}>
                  <AppNavigator />
                </View>
              </View>
            </DataProvider>
          </AuthProvider>
        </ToastProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: '#140303',
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mobileRootContainer: {
    backgroundColor: '#FFFDF7',
    alignItems: 'stretch',
    justifyContent: 'flex-start',
  },
  frameContainer: {
    flex: 1,
    width: '100%',
    backgroundColor: '#FFFDF7',
    overflow: 'hidden',
  },
  webDeviceFrame: {
    width: '100%',
    maxWidth: 425,
    aspectRatio: 9 / 19.5,
    maxHeight: '96%',
    borderRadius: 44,
    marginVertical: 12,
    borderWidth: 8,
    borderColor: '#240808',
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.45,
    shadowRadius: 36,
    elevation: 24,
    position: 'relative',
  },
  phoneNotchBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
    pointerEvents: 'none',
  },
  phoneIsland: {
    width: 100,
    height: 18,
    backgroundColor: '#0F0202',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  phoneCameraDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#0F172A',
  },
  phoneSpeakerPill: {
    width: 32,
    height: 3.5,
    borderRadius: 2,
    backgroundColor: '#1E293B',
  },
  navigatorWrapper: {
    flex: 1,
    width: '100%',
  },
});
