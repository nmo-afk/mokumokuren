@echo off
cd /d "%~dp0"
where py >nul 2>&1
if %errorlevel%==0 (
  py -3 local_server.py
) else (
  where python >nul 2>&1
  if %errorlevel%==0 (
    python local_server.py
  ) else (
    echo Python 3 is required. Install from python.org/downloads/windows/
    pause
    exit /b 1
  )
)
pause
