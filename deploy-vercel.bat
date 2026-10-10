@echo off
echo ========================================================
echo        Malla Mata App - Vercel Deployment Helper
echo ========================================================
echo.
echo 1. Building production web bundle (expo export -p web)...
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Web build failed. Aborting deployment.
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo 2. Deploying to Vercel...
echo If you have not logged in yet, Vercel will open a quick authentication page.
call npx vercel --prod

echo.
echo Deployment process finished.
pause
