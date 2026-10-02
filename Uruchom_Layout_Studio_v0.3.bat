@echo off
cd /d "%~dp0"
title Layout Studio Pro 3D v0.3
where node >nul 2>nul
if errorlevel 1 (
  echo Zainstaluj Node.js 22.12 lub nowszy, a potem wykonaj npm ci.
  pause
  exit /b 1
)
if not exist node_modules (
  call npm ci
  if errorlevel 1 exit /b 1
)
call npm run build
if errorlevel 1 (
  pause
  exit /b 1
)
echo Otworz http://127.0.0.1:4173 w przegladarce.
echo Projekt jest zapisywany lokalnie w tej przegladarce.
call npm start
pause
