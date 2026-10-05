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
            overflow: hidden !important;
          }
          #root {
            height: 100% !important;
            width: 100% !important;
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
            justify-content: center !important;
            overflow: hidden !important;
          }
          @media (max-width: 520px) {
            html, body, #root {
              background: #FFFDF7 !important;
              align-items: stretch !important;
              justify-content: flex-start !important;
              height: 100% !important;
              width: 100% !important;
              overflow: hidden !important;
            }
          }
          input, textarea, select {
            font-family: 'Plus Jakarta Sans', sans-serif !important;
          }
          /* Ensure all scroll containers scroll smoothly on touch & wheel */
          div[style*="overflow-y: auto"], div[style*="overflow-y: scroll"], .r-overflowY-1rnoaur {
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

      // Universal scroller resolution for React Native Web
      const getActiveScroller = (target) => {
        let curr = target;
        while (curr && curr !== document.body && curr !== document.documentElement) {
          if (curr.scrollHeight > curr.clientHeight && curr.clientHeight > 0) {
            const style = window.getComputedStyle(curr);
            if (style.overflowY === 'auto' || style.overflowY === 'scroll') {
              return curr;
            }
          }
          curr = curr.parentElement;
        }

        // RNW scroll container candidates
        const candidates = document.querySelectorAll('[scrollable="true"], .r-150rngu, div[class*="r-150rngu"]');
        for (let i = candidates.length - 1; i >= 0; i--) {
          const el = candidates[i];
          if (el.scrollHeight > el.clientHeight && el.clientHeight > 0) {
            return el;
          }
        }

        // Fallback: search all divs
        const allDivs = document.querySelectorAll('div');
        for (let i = allDivs.length - 1; i >= 0; i--) {
          const el = allDivs[i];
          if (el.scrollHeight > el.clientHeight && el.clientHeight > 0) {
            const style = window.getComputedStyle(el);
            if (style.overflowY === 'auto' || style.overflowY === 'scroll') {
              return el;
            }
          }
        }
        return null;
      };

      // 1. Forward mouse wheel anywhere on desktop screen to the active scroller
      const handleGlobalWheel = (e) => {
        const scroller = getActiveScroller(e.target);
        if (scroller) {
          if (!scroller.contains(e.target)) {
            scroller.scrollTop += e.deltaY;
          }
        }
      };

      // 2. Keyboard scrolling (ArrowDown, ArrowUp, PageDown, PageUp, Spacebar)
      const handleGlobalKeyDown = (e) => {
        const tag = e.target?.tagName?.toLowerCase();
        if (tag === 'input' || tag === 'textarea' || e.target?.isContentEditable) return;

        const scroller = getActiveScroller(e.target);
        if (!scroller) return;

        if (e.key === 'ArrowDown') {
          scroller.scrollTop += 60;
          e.preventDefault();
        } else if (e.key === 'ArrowUp') {
          scroller.scrollTop -= 60;
          e.preventDefault();
        } else if (e.key === 'PageDown' || (e.key === ' ' && !e.shiftKey)) {
          scroller.scrollTop += scroller.clientHeight * 0.75;
          e.preventDefault();
        } else if (e.key === 'PageUp' || (e.key === ' ' && e.shiftKey)) {
          scroller.scrollTop -= scroller.clientHeight * 0.75;
          e.preventDefault();
        }
      };

      // 3. Desktop Click-and-Drag to scroll (Touch emulation)
      let isDragging = false;
      let startY = 0;
      let startScrollTop = 0;
      let activeDragScroller = null;

      const handleMouseDown = (e) => {
        if (e.button !== 0) return;
        const tag = e.target?.tagName?.toLowerCase();
        if (tag === 'input' || tag === 'textarea' || tag === 'button') return;

        const scroller = getActiveScroller(e.target);
        if (!scroller) return;

        isDragging = true;
        startY = e.clientY;
        startScrollTop = scroller.scrollTop;
        activeDragScroller = scroller;
      };

      const handleMouseMove = (e) => {
        if (!isDragging || !activeDragScroller) return;
        const deltaY = e.clientY - startY;
        if (Math.abs(deltaY) > 4) {
          activeDragScroller.scrollTop = startScrollTop - deltaY;
        }
      };

      const handleMouseUp = () => {
        isDragging = false;
        activeDragScroller = null;
      };

      window.addEventListener('wheel', handleGlobalWheel, { passive: true });
      window.addEventListener('keydown', handleGlobalKeyDown);
      window.addEventListener('mousedown', handleMouseDown);
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);

      return () => {
        window.removeEventListener('wheel', handleGlobalWheel);
        window.removeEventListener('keydown', handleGlobalKeyDown);
        window.removeEventListener('mousedown', handleMouseDown);
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
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
    overflow: 'hidden',
  },
});
