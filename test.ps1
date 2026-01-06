@echo off
setlocal enabledelayedexpansion

:: ============================================================================
:: SYSTEM UTILITIES MENU (2025-2026 Edition)
:: ============================================================================
:: A multi-purpose utility script for common Windows maintenance tasks.
:: ============================================================================

:init
title System Utilities CLI v2026
:: Adjusted window height for new options
mode con: cols=85 lines=38
color 0B
set "log_file=utility_errors.log"

:: Detect PowerShell Versions
set "ps_version=Windows PowerShell 5.1"
for /f "tokens=3" %%a in ('powershell -command "$PSVersionTable.PSVersion.Major" 2^>nul') do set "ps_major=%%a"
pwsh -command "$PSVersionTable.PSVersion.Major" >nul 2>&1
if %errorLevel% == 0 (
    set "ps7_status=[PS7 DETECTED]"
) else (
    set "ps7_status=[PS5 ONLY]"
)

:: Check for Administrative privileges
net session >nul 2>&1
if %errorLevel% == 0 (
    set "admin_status=[ADMIN ACCESS GRANTED]"
) else (
    set "admin_status=[USER MODE - SOME TASKS MAY FAIL]"
)

:menu
cls
echo.
echo  =====================================================================================
echo     %admin_status%   %ps7_status%
echo  =====================================================================================
echo     System Utilities Dashboard (2025-2026)
echo  =====================================================================================
echo.
echo     1. System Information              8. Open Registry Editor
echo     2. Check Disk (Read-Only)          9. Disk Cleanup (Cleanmgr)
echo     3. List Running Processes          10. System Uptime
echo     4. IP Configuration                11. PowerShell IRM Runner
echo     5. List Active Connections         12. IRM Command Creator
echo     6. Flush DNS Cache                 13. PS Expression Evaluator (iex)
echo     7. System File Checker (SFC)
echo.
echo  -------------------------------------------------------------------------------------
echo     L. View Error Log                  H. Help / About                    0. Exit
echo  =====================================================================================
echo.
set /p "choice= Enter your selection [0-13, L or H]: "

if /i "%choice%"=="1" goto sysinfo
if /i "%choice%"=="2" goto chkdsk
if /i "%choice%"=="3" goto tasks
if /i "%choice%"=="4" goto ipconfig
if /i "%choice%"=="5" goto netstat
if /i "%choice%"=="6" goto dnsflush
if /i "%choice%"=="7" goto sfc
if /i "%choice%"=="8" goto regedit
if /i "%choice%"=="9" goto cleanup
if /i "%choice%"=="10" goto uptime
if /i "%choice%"=="11" goto irm
if /i "%choice%"=="12" goto irm_create
if /i "%choice%"=="13" goto iex_eval
if /i "%choice%"=="L" goto view_log
if /i "%choice%"=="H" goto help
if /i "%choice%"=="0" exit

:: Handle invalid input
echo.
echo  [!] Invalid selection. Please try again.
timeout /t 2 >nul
goto menu

:error_handler
echo [%date% %time%] ERROR: Command failed with exit code %~1 in section %~2 >> %log_file%
echo.
echo  [!] AN ERROR OCCURRED (Exit Code: %~1)
echo      The system error was suppressed. Check %log_file% for details.
echo.
pause
goto menu

:sysinfo
cls
echo  [ PROCESS: System Information ]
echo.
systeminfo | findstr /B /C:"OS Name" /C:"OS Version" /C:"System Type" /C:"Total Physical Memory"
if %errorLevel% neq 0 call :error_handler %errorLevel% "sysinfo"
echo.
pause
goto menu

:chkdsk
cls
echo  [ PROCESS: Check Disk ]
echo.
chkdsk
if %errorLevel% neq 0 call :error_handler %errorLevel% "chkdsk"
echo.
pause
goto menu

:tasks
cls
echo  [ PROCESS: Task List ]
echo.
tasklist /NH | sort
if %errorLevel% neq 0 call :error_handler %errorLevel% "tasks"
echo.
pause
goto menu

:ipconfig
cls
echo  [ PROCESS: IP Configuration ]
echo.
ipconfig | findstr /R "IPv4 IPv6 Subnet Default"
if %errorLevel% neq 0 call :error_handler %errorLevel% "ipconfig"
echo.
pause
goto menu

:netstat
cls
echo  [ PROCESS: Active Connections ]
echo.
netstat -an | findstr "ESTABLISHED"
if %errorLevel% neq 0 call :error_handler %errorLevel% "netstat"
echo.
pause
goto menu

:dnsflush
cls
echo  [ PROCESS: Flushing DNS Cache ]
echo.
ipconfig /flushdns
if %errorLevel% neq 0 call :error_handler %errorLevel% "dnsflush"
echo.
pause
goto menu

:sfc
cls
echo  [ PROCESS: System File Checker ]
echo.
echo  Note: This requires Administrator privileges and may take some time.
echo  Executing Full Scan and Repair...
echo.
sfc /scannow
if %errorLevel% neq 0 call :error_handler %errorLevel% "sfc"
echo.
pause
goto menu

:regedit
cls
echo  [ PROCESS: Launching Registry Editor ]
start regedit.exe
if %errorLevel% neq 0 call :error_handler %errorLevel% "regedit"
timeout /t 2 >nul
goto menu

:cleanup
cls
echo  [ PROCESS: Disk Cleanup ]
echo.
echo  Opening Windows Disk Cleanup utility...
start cleanmgr.exe /d %systemdrive%
if %errorLevel% neq 0 call :error_handler %errorLevel% "cleanup"
echo.
pause
goto menu

:uptime
cls
echo  [ PROCESS: System Uptime ]
echo.
net stats srv | find "Statistics since"
if %errorLevel% neq 0 call :error_handler %errorLevel% "uptime"
echo.
pause
goto menu

:irm
cls
echo  [ PROCESS: PowerShell IRM Runner ]
echo.
echo  This tool executes web-hosted scripts via Invoke-RestMethod.
echo.
set "engine=powershell"
if "%ps7_status%"=="[PS7 DETECTED]" (
    echo [PS7 Detected] Would you like to use PowerShell 7? (Y/N)
    set /p "use_ps7= Selection: "
    if /i "!use_ps7!"=="Y" set "engine=pwsh"
)
set /p "url= Enter Script URL (or press Enter for christitus.com/win): "
if "%url%"=="" set "url=christitus.com/win"
echo.
echo  Executing via !engine!...
echo.
:: Redirect stderr (2) to nul to hide raw PowerShell errors
!engine! -NoProfile -ExecutionPolicy Bypass -Command "irm %url% | iex" 2>nul
if %errorLevel% neq 0 call :error_handler %errorLevel% "irm"
echo.
pause
goto menu

:irm_create
cls
echo  [ PROCESS: IRM Command Creator ]
echo.
echo  This helper generates the command string for remote PowerShell execution.
echo.
set /p "new_url= Enter the raw URL of your .ps1 script: "
if "%new_url%"=="" (
    echo [!] No URL provided. Returning to menu.
    timeout /t 2 >nul
    goto menu
)
echo.
echo  --------------------------------------------------------------------------
echo  GENERATED COMMAND:
echo  powershell -ExecutionPolicy Bypass -Command "irm %new_url% | iex"
echo  --------------------------------------------------------------------------
echo.
echo  Options:
echo  [E] Execute Now
echo  [M] Back to Menu
echo.
set /p "sub_choice= Selection: "
if /i "%sub_choice%"=="E" (
    powershell -NoProfile -ExecutionPolicy Bypass -Command "irm %new_url% | iex" 2>nul
    if %errorLevel% neq 0 call :error_handler %errorLevel% "irm_create_exec"
    pause
)
goto menu

:iex_eval
cls
echo  [ PROCESS: PS Expression Evaluator ]
echo.
echo  Directly invokes a string as a command using 'iex' (Invoke-Expression).
echo  Ref: Microsoft Docs (PowerShell 7.5)
echo.
set /p "ps_expr= Enter PowerShell Expression to evaluate: "
if "%ps_expr%"=="" goto menu
echo.
echo  Result:
echo.
powershell -NoProfile -ExecutionPolicy Bypass -Command "Invoke-Expression '%ps_expr%'" 2>nul
if %errorLevel% neq 0 call :error_handler %errorLevel% "iex_eval"
echo.
pause
goto menu

:view_log
cls
echo  [ PROCESS: Viewing Error Log ]
echo.
if not exist %log_file% (
    echo  No errors have been logged yet.
) else (
    type %log_file%
)
echo.
echo  --------------------------------------------------------------------------
echo  [C] Clear Log  [B] Back to Menu
echo.
set /p "log_choice= Selection: "
if /i "%log_choice%"=="C" del %log_file% & echo Log cleared. & timeout /t 2 >nul
goto menu

:help
cls
echo  [ HELP / ABOUT ]
echo.
echo  This batch script was designed to simplify common terminal tasks.
echo.
echo  - VERSION: 1.0.9
echo  - PERIOD: 2025-2026
echo  - STATUS: Open Source / Editable
echo  - CHANGE LOG: Added PS7 detection and Expression Evaluator (iex).
echo.
pause
goto menu