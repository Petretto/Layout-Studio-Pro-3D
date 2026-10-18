@echo off
cd /d "%~dp0"
title Layout Studio Pro 3D v0.4.0 — Serwer Lokalny (Offline)

where node >nul 2>nul
if errorlevel 1 (
  echo Blad: Node.js nie jest zainstalowany lub nie ma go w zmiennej PATH.
  echo Pobierz Node.js LTS ze strony https://nodejs.org/
  pause
  exit /b 1
)

if not exist "dist\index.html" (
  echo Katalog dist nie istnieje. Rozpoczynanie kompilacji produkcyjnej...
  call npm run build
  if errorlevel 1 (
    echo Blad podczas kompilacji projektu.
    pause
    exit /b 1
  )
)

echo =================================================================
echo Layout Studio Pro 3D v0.4.0 — Uruchamianie w trybie lokalnym
echo =================================================================
echo Aplikacja dziala w 100%% w Twojej przegladarce (brak wysylania danych).
echo Otwieranie przegladarki: http://127.0.0.1:4173
echo.
echo Aby zatrzymac serwer, nacisnij Ctrl+C w tym oknie.
echo =================================================================

start http://127.0.0.1:4173
node scripts\serve.mjs
pause
