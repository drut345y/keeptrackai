@echo off
cd /d "%~dp0"
title LockIn AI Server
echo ========================================================
echo               LockIn AI Local Server
echo ========================================================
echo.
echo Starting Vite server at http://localhost:5173 ...
echo.
echo * Keep this window OPEN while using LockIn AI.
echo * You can minimize this window to your taskbar.
echo * To stop the server later, simply close this window.
echo.
echo Launching your browser in 2 seconds...
timeout /t 2 /nobreak >nul
start http://localhost:5173
npm run dev
