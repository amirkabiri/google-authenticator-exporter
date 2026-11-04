@echo off
setlocal
cd /d "%~dp0"

set "APP_DIR=%~dp0"
set "LAUNCHER=%APP_DIR%start-app.cmd"

if not exist "%LAUNCHER%" (
  echo [ERROR] No se encontro start-app.cmd en esta carpeta.
  pause
  exit /b 1
)

powershell -NoProfile -ExecutionPolicy Bypass -Command "$ws = New-Object -ComObject WScript.Shell; $desktop = [Environment]::GetFolderPath('Desktop'); $sc = $ws.CreateShortcut((Join-Path $desktop 'Google Authenticator Exporter.lnk')); $sc.TargetPath = $env:LAUNCHER; $sc.WorkingDirectory = $env:APP_DIR; $sc.Description = 'Abrir Google Authenticator Exporter'; $sc.IconLocation = 'shell32.dll,13'; $sc.Save()"

if errorlevel 1 (
  echo [ERROR] No se pudo crear el acceso directo.
  pause
  exit /b 1
)

echo Acceso directo creado en el escritorio: "Google Authenticator Exporter"
echo Puedes moverlo o copiarlo a cualquier otra ubicacion.
pause
endlocal
