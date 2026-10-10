@echo off
title Malla Mata Navratri 2026 - Firebase Website Deployer
color 0C

:MENU
cls
echo ================================================================
echo   MALLA MATA NAVRATRI MAHOTSAV 2026 - FIREBASE WEBSITE DEPLOYER
echo ================================================================
echo.
echo  Target Firebase Project: malla-mata-2026
echo  Live Website URL: https://malla-mata-2026.web.app
echo.
echo ================================================================
echo.
echo  Please choose an option:
echo.
echo   [1] Full Deploy (Build Website & Deploy to Firebase Hosting)
echo   [2] Login to Firebase (One-time Google Account link)
echo   [3] Deploy Database Security Rules Only
echo   [4] Open Firebase Project in Browser
echo   [5] Exit
echo.
set /p choice="Enter your choice (1-5): "

if "%choice%"=="1" goto DEPLOY_ALL
if "%choice%"=="2" goto LOGIN
if "%choice%"=="3" goto DEPLOY_RULES
if "%choice%"=="4" goto OPEN_BROWSER
if "%choice%"=="5" exit
goto MENU

:LOGIN
cls
echo ================================================================
echo   LOGGING IN TO FIREBASE (GOOGLE ACCOUNT)
echo ================================================================
echo.
echo  A browser tab will open. Select your Google account (%username%)
echo  and click "Allow" to authenticate.
echo.
npx firebase-tools login
echo.
pause
goto MENU

:DEPLOY_ALL
cls
echo ================================================================
echo   STEP 1: BUILDING PRODUCTION WEB BUNDLE
echo ================================================================
echo.
call npm run build
if %errorlevel% neq 0 (
  echo.
  echo  [ERROR] Web export failed! Please check above errors.
  pause
  goto MENU
)

echo.
echo ================================================================
echo   STEP 2: DEPLOYING TO FIREBASE HOSTING (malla-mata-2026)
echo ================================================================
echo.
npx firebase-tools deploy --only hosting
if %errorlevel% neq 0 (
  echo.
  echo  [NOTE] If authentication failed, please run Option [2] to Login first.
) else (
  echo.
  echo  ================================================================
  echo    SUCCESS! WEBSITE DEPLOYED TO FIREBASE HOSTING
  echo    URL: https://malla-mata-2026.web.app
  echo  ================================================================
)
echo.
pause
goto MENU

:DEPLOY_RULES
cls
echo ================================================================
echo   DEPLOYING REALTIME DATABASE SECURITY RULES
echo ================================================================
echo.
npx firebase-tools deploy --only database
echo.
pause
goto MENU

:OPEN_BROWSER
start https://console.firebase.google.com/u/1/project/malla-mata-2026/overview
goto MENU
