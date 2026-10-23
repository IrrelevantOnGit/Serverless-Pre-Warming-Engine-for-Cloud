@echo off
setlocal
title ProphetX Dashboard Launcher
color 0A

echo.
echo  =====================================================
echo   ProphetX - Adaptive Serverless Pre-Warming Engine
echo   ML-Guided Cold Start Elimination
echo  =====================================================
echo.

cd /d "%~dp0"
echo  Working directory: %CD%
echo.

echo  [1/3] Checking Node.js...
where node >nul 2>&1
if %ERRORLEVEL% neq 0 (
    color 0C
    echo  ERROR: Node.js was not found in your PATH.
    echo  Please install Node.js from https://nodejs.org
    echo.
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('node -v') do echo  Found Node.js %%i
echo.

echo  [2/3] Checking dependencies...
if not exist "%~dp0dashboard\node_modules" (
    echo  First run detected. Installing dependencies...
    cd /d "%~dp0dashboard"
    call npm install
    if %ERRORLEVEL% neq 0 (
        color 0C
        echo  ERROR: npm install failed.
        pause
        exit /b 1
    )
    echo  Dependencies installed successfully.
) else (
    echo  Dependencies OK.
)
echo.

echo  [3/3] Launching dashboard server...
echo.
echo  =====================================================
echo   Dashboard URL: http://localhost:5173/
echo   Opening in your default browser...
echo   Press Ctrl+C in this window to stop the server.
echo  =====================================================
echo.

cd /d "%~dp0dashboard"
call npx vite --host --open

echo.
echo  Server stopped.
pause
