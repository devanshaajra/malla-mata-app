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
          }
          #root {
            height: 100% !important;
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
              width: 100% !important;
            }
          }
          input, textarea, select {
            font-family: 'Plus Jakarta Sans', sans-serif !important;
          }
          /* Universal Scroll Resolution: ensure all flex containers shrink to viewport height */
          .r-13awgt0, .r-1pi2tsx {
            min-height: 0 !important;
          }
          /* All React Navigation stack screens and scene wrappers MUST allow vertical scrolling */
          div[class*="r-105ug2t"],
          div[data-testid="react-navigation-stack-scene"],
          [data-testid="react-navigation-scene"] {
            max-height: 100% !important;
            overflow-y: auto !important;
            -webkit-overflow-scrolling: touch !important;
            touch-action: pan-y !important;
            overscroll-behavior-y: contain !important;
          }
          /* Ensure all ScrollView containers allow vertical scrolling and clamp to screen height */
          div[style*="overflow-y: auto"], div[style*="overflow-y: scroll"], .r-overflowY-1rnoaur, [data-scrollable="true"] {
            max-height: 100% !important;
            overflow-y: auto !important;
            -webkit-overflow-scrolling: touch !important;
            overscroll-behavior-y: contain !important;
            touch-action: pan-y !important;
          }
          /* High-visibility Navratri custom scrollbar */
          ::-webkit-scrollbar {
            width: 8px !important;
            height: 8px !important;
          }
          ::-webkit-scrollbar-track {
            background: rgba(254, 243, 199, 0.4) !important;
            border-radius: 4px !important;
          }
          ::-webkit-scrollbar-thumb {
            background: linear-gradient(180deg, #DC2626, #EA580C) !important;
            border-radius: 4px !important;
            border: 1px solid rgba(255, 255, 255, 0.4) !important;
          }
          ::-webkit-scrollbar-thumb:hover {
            background: #B91C1C !important;
          }
        `;
        document.head.appendChild(style);
      }

      // Passive wheel forwarder for desktop background clicks outside device frame
      const handleDesktopOuterWheel = (e) => {
        // Find scrollers inside the app frame
        const scrollers = document.querySelectorAll('[data-scrollable="true"], div[style*="overflow-y: auto"], div[style*="overflow-y: scroll"], .r-150rngu');
        for (let i = scrollers.length - 1; i >= 0; i--) {
          const s = scrollers[i];
          if (s && s.scrollHeight > s.clientHeight && s.clientHeight > 0) {
            // Only forward if the mouse was outside this scroller
            if (!s.contains(e.target)) {
              s.scrollTop += e.deltaY;
            }
            break;
          }
        }
      };

      // Keyboard scrolling for desktop accessibility (Arrow keys, Page Up/Down)
      const handleGlobalKeyDown = (e) => {
        const tag = e.target?.tagName?.toLowerCase();
        if (tag === 'input' || tag === 'textarea' || e.target?.isContentEditable) return;

        const scrollers = document.querySelectorAll('[data-scrollable="true"], div[style*="overflow-y: auto"], div[style*="overflow-y: scroll"], .r-150rngu');
        let activeScroller = null;
        for (let i = scrollers.length - 1; i >= 0; i--) {
          const s = scrollers[i];
          if (s && s.scrollHeight > s.clientHeight && s.clientHeight > 0) {
            activeScroller = s;
            break;
          }
        }
        if (!activeScroller) return;

        if (e.key === 'ArrowDown') {
          activeScroller.scrollTop += 60;
          e.preventDefault();
        } else if (e.key === 'ArrowUp') {
          activeScroller.scrollTop -= 60;
          e.preventDefault();
        } else if (e.key === 'PageDown' || (e.key === ' ' && !e.shiftKey)) {
          activeScroller.scrollTop += activeScroller.clientHeight * 0.75;
          e.preventDefault();
        } else if (e.key === 'PageUp' || (e.key === ' ' && e.shiftKey)) {
          activeScroller.scrollTop -= activeScroller.clientHeight * 0.75;
          e.preventDefault();
        }
      };

      window.addEventListener('wheel', handleDesktopOuterWheel, { passive: true });
      window.addEventListener('keydown', handleGlobalKeyDown);

      return () => {
        window.removeEventListener('wheel', handleDesktopOuterWheel);
        window.removeEventListener('keydown', handleGlobalKeyDown);
      };
    }
  }, []);

  const RootView = Platform.OS === 'web' ? View : GestureHandlerRootView;

  return (
    <RootView style={[styles.rootContainer, isMobileViewport && styles.mobileRootContainer]}>
      <SafeAreaProvider style={[styles.rootContainer, isMobileViewport && styles.mobileRootContainer]}>
        <ToastProvider>
          <AuthProvider>
            <DataProvider>
              <StatusBar barStyle="light-content" backgroundColor="#DC2626" />

              {/* Main App Container */}
              <View style={[styles.frameContainer, !isMobileViewport && styles.webDeviceFrame]}>
                <View style={styles.navigatorWrapper}>
                  <AppNavigator />
                </View>
              </View>
            </DataProvider>
          </AuthProvider>
        </ToastProvider>
      </SafeAreaProvider>
    </RootView>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: '#140303',
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mobileRootContainer: {
    backgroundColor: '#FFFDF7',
    alignItems: 'stretch',
    justifyContent: 'flex-start',
    height: '100%',
    width: '100%',
  },
  frameContainer: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#FFFDF7',
    overflow: 'hidden',
  },
  webDeviceFrame: {
    width: '100%',
    maxWidth: 480,
    height: '96vh',
    maxHeight: 920,
    borderRadius: 32,
    marginVertical: 'auto',
    borderWidth: 1.5,
    borderColor: 'rgba(220, 38, 38, 0.25)',
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.35,
    shadowRadius: 36,
    elevation: 24,
    position: 'relative',
    overflow: 'hidden',
  },
  navigatorWrapper: {
    flex: 1,
    width: '100%',
    height: '100%',
    minHeight: 0,
  },
});
