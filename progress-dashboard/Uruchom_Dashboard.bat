@echo off
cd /d "%~dp0"
title Layout Studio Pro — Pulpit Postepu (Live)
where node >nul 2>nul
if errorlevel 1 (
  echo Blad: Node.js nie jest zainstalowany lub nie ma go w PATH.
  pause
  exit /b 1
)
node server.mjs
pause
