@echo off
rem NurseLinguo demo launcher - double-click this file.
rem It runs scripts\start-demo.ps1 with ExecutionPolicy Bypass so the owner
rem never has to type a PowerShell command or change machine policy.
setlocal
title NurseLinguo demo launcher

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\start-demo.ps1" %*
set RC=%ERRORLEVEL%

echo.
if not "%RC%"=="0" (
  echo Demo launcher failed with exit code %RC%. Read the FAILED line above.
) else (
  echo Demo stack is up. Open http://localhost:5173
)

rem Keep the window open when this file is double-clicked, but not when it is
rem called from an existing shell. findstr is used because some shells on PATH
rem ship a GNU "find" that would shadow the Windows one.
echo %cmdcmdline% | findstr /i /c:"%~f0" >nul
if not errorlevel 1 pause
exit /b %RC%
