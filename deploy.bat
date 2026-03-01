@echo off
REM One-Command Deployment Script for Smart EV Overlay (Windows)
REM Usage: deploy.bat

echo ==========================================
echo  Smart EV Overlay - Automated Deployment
echo ==========================================
echo.

REM Check prerequisites
echo [1/7] Checking prerequisites...

where pnpm >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: pnpm not found. Please install: npm install -g pnpm
    exit /b 1
)

where wrangler >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo Installing Wrangler...
    npm install -g wrangler
)

echo OK
echo.

REM Install dependencies
echo [2/7] Installing dependencies...
call pnpm install
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to install dependencies
    exit /b 1
)
echo OK
echo.

REM Build packages
echo [3/7] Building packages...
call pnpm build
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Build failed
    exit /b 1
)
echo OK
echo.

REM Run tests
echo [4/7] Running tests...
call pnpm test
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Tests failed
    exit /b 1
)
echo OK
echo.

REM Check KV namespace
echo [5/7] Checking KV namespace...
cd workers/api

for /f "tokens=*" %%a in ('wrangler kv namespace list 2^>nul ^| findstr "id"') do (
    set KV_LINE=%%a
)

if not defined KV_LINE (
    echo Creating KV namespace...
    wrangler kv namespace create "ROUTE_CACHE"
    echo.
    echo ==========================================
    echo IMPORTANT: Update wrangler.toml with the
    echo namespace ID shown above, then run again.
    echo ==========================================
    exit /b 1
)

echo OK
echo.

REM Deploy Worker
echo [6/7] Deploying Cloudflare Worker...
call wrangler deploy
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Worker deployment failed
    exit /b 1
)
echo OK
echo.

REM Get Worker URL from wrangler.toml
for /f "tokens=*" %%a in ('findstr /C:"name = " wrangler.toml') do (
    set WORKER_NAME=%%a
)
set WORKER_NAME=%WORKER_NAME:name = %
set WORKER_NAME=%WORKER_NAME:"=%
set WORKER_URL=https://%WORKER_NAME%.workers.dev

echo Worker URL: %WORKER_URL%
echo.

REM Deploy Web App
echo [7/7] Deploying Web App...
cd ..\..\apps-web

echo VITE_API_URL=%WORKER_URL%/api > .env.production

call pnpm build
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Web build failed
    exit /b 1
)

call wrangler pages deploy dist --project-name=ev-overlay
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Pages deployment failed
    exit /b 1
)

echo OK
echo.

REM Done
echo ==========================================
echo  Deployment Complete!
echo ==========================================
echo.
echo Web App: https://ev-overlay.pages.dev
echo API:     %WORKER_URL%
echo.
echo Next steps:
echo   1. Test your app: https://ev-overlay.pages.dev
echo   2. Set up custom domain (optional)
echo.

pause
