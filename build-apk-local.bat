@echo off
title Malla Mata Navratri 2026 - Direct Local APK Builder
color 0A

echo ================================================================
echo   MALLA MATA NAVRATRI 2026 - DIRECT LOCAL APK BUILDER
echo   (No EAS Account or Sign-up Required)
echo ================================================================
echo.
echo [1/3] Exporting React Native bundle...
call npx expo export --platform android

echo.
echo [2/3] Preparing Android native project...
call npx expo prebuild --platform android --no-install

echo.
echo [3/3] Building APK with Gradle...
if exist android\gradlew.bat (
    cd android
    call gradlew.bat assembleRelease --no-daemon
    cd ..
    echo.
    echo ================================================================
    echo  APK BUILD COMPLETE!
    echo  Location: android\app\build\outputs\apk\release\app-release.apk
    echo ================================================================
) else (
    echo [!] Android native directory ready. Build APK in Android Studio or GitHub Actions.
)
echo.
pause
