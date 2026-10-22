@echo off
setlocal enabledelayedexpansion
title ProphetX Dashboard Launcher
color 0A

echo.
echo  =====================================================
echo   ProphetX - Adaptive Serverless Pre-Warming Engine
echo   ML-Guided Cold Start Elimination
echo  =====================================================
echo.

:: Navigate to the folder where this .bat file lives
cd /d "%~dp0"
echo  Working directory: %CD%
echo.

:: Check Node.js
echo  [1/3] Checking Node.js...
where node >nul 2>&1
if %ERRORLEVEL% neq 0 (
    color 0C
    echo  ERROR: Node.js not found. Install from https://nodejs.org
    echo.
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('node -v') do echo  Found Node.js %%i
echo.

:: Check npm
where npm >nul 2>&1
if %ERRORLEVEL% neq 0 (
    color 0C
    echo  ERROR: npm not found. Reinstall Node.js from https://nodejs.org
    echo.
    pause
    exit /b 1
)

:: Install deps if needed
echo  [2/3] Checking dependencies...
if not exist "%~dp0dashboard\node_modules" (
    echo  First run detected. Installing dependencies...
    cd /d "%~dp0dashboard"
    npm install
    if %ERRORLEVEL% neq 0 (
        color 0C
        echo  ERROR: npm install failed.
        pause
        exit /b 1
    )
    echo  Dependencies installed.
) else (
    echo  Dependencies OK.
)
echo.

:: Launch browser after 3 seconds (in background)
echo  [3/3] Launching dashboard server...
echo.
echo  Dashboard URL:  http://localhost:5173/
echo  Press Ctrl+C to stop the server.
echo.

start "" /b cmd /c "timeout /t 3 /nobreak >nul 2>&1 && start http://localhost:5173/"

:: Start Vite dev server (this blocks and keeps the window open)
cd /d "%~dp0dashboard"
npx vite --host

:: If we get here, the server stopped
echo.
echo  Server stopped.
pause
