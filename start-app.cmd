@echo off
setlocal
cd /d "%~dp0"

where npm.cmd >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js y npm son necesarios para ejecutar la aplicacion.
  echo Instalalos desde https://nodejs.org/ y vuelve a intentarlo.
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo Instalando dependencias por primera vez...
  call npm.cmd install
  if errorlevel 1 (
    echo [ERROR] No se pudieron instalar las dependencias.
    pause
    exit /b 1
  )
)

if not exist "dist" (
  echo Compilando la aplicacion por primera vez...
  echo Los archivos JSON de la carpeta data/ se incluiran en esta compilacion.
  call npm.cmd run build
  if errorlevel 1 (
    echo [ERROR] La compilacion fallo. Revisa los mensajes anteriores.
    pause
    exit /b 1
  )
)

echo.
echo Abriendo la aplicacion en el navegador...
echo Cierra esta ventana para detener el servidor local.
call npm.cmd run preview -- --open

endlocal
