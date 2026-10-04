@echo off
title Malla Mata Navratri 2026 - Standalone APK Builder
color 0E

:MENU
cls
echo ================================================================
echo   MALLA MATA NAVRATRI MAHOTSAV 2026 - ANDROID APK BUILDER
echo ================================================================
echo.
echo  This tool builds a standalone .apk file (^< 40 MB) that can be:
echo   - Installed directly on any Android phone
echo   - Shared directly via WhatsApp as a document/file
echo   - Synced in real-time with all other devices
echo.
echo ================================================================
echo.
echo  Please choose an option:
echo.
echo   [1] Log In to existing Expo / EAS Account
echo   [2] Register a NEW FREE Expo Account (Takes 30 seconds)
echo   [3] Open Expo Signup Page in Web Browser (Easiest)
echo   [4] Start Android APK Cloud Build
echo   [5] Exit
echo.
set /p choice="Enter your choice (1-5): "

if "%choice%"=="1" goto LOGIN
if "%choice%"=="2" goto REGISTER
if "%choice%"=="3" goto BROWSER_SIGNUP
if "%choice%"=="4" goto BUILD
if "%choice%"=="5" exit
goto MENU

:BROWSER_SIGNUP
cls
echo Opening https://expo.dev/signup in your default browser...
start https://expo.dev/signup
echo.
echo Please create your account on the web page:
echo 1. Enter email, username, and password.
echo 2. Click "Create your account".
echo 3. Return here and choose Option [1] or [4] to log in and build.
echo.
pause
goto MENU

:REGISTER
cls
echo ================================================================
echo  CREATING NEW EXPO ACCOUNT
echo ================================================================
echo.
call npx --yes eas-cli register
echo.
pause
goto MENU

:LOGIN
cls
echo ================================================================
echo  LOGGING IN TO EXPO / EAS
echo ================================================================
echo.
call npx --yes eas-cli login
echo.
pause
goto MENU

:BUILD
cls
echo ================================================================
echo  STARTING ANDROID APK CLOUD BUILD
echo ================================================================
echo.
call npx --yes eas-cli build -p android --profile preview
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ----------------------------------------------------------------
    echo  [!] Build did not complete. Please check the error message above.
    echo      If login failed, choose Option [1] or [3] from the menu.
    echo ----------------------------------------------------------------
    pause
    goto MENU
)

echo.
echo ================================================================
echo  🎉 BUILD COMPLETE!
echo  1. Open the download link shown above to get your .apk file.
echo  2. Attach the .apk file in WhatsApp and send to members!
echo ================================================================
pause
goto MENU
