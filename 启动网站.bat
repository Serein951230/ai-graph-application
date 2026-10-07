@echo off
cd /d "%~dp0"
where node >nul 2>&1
if errorlevel 1 (
  echo Node.js is required. Install Node.js LTS from https://nodejs.org/
  pause
  exit /b 1
)
where npm >nul 2>&1
if errorlevel 1 (
  echo npm was not found. Reinstall Node.js LTS.
  pause
  exit /b 1
)
if not exist "node_modules\" (
  echo Installing this project's dependencies for the first run...
  call npm ci
  if errorlevel 1 (
    echo Dependency installation failed. Check the network and retry.
    pause
    exit /b 1
  )
)
echo Open http://127.0.0.1:5173/ in your browser after the server starts.
call npm run dev
pause
