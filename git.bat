@echo off
setlocal enabledelayedexpansion

REM === Prompt for remote URL ===
set /p remoteUrl="Enter remote URL (e.g., https://github.com/user/repo.git): "
if "%remoteUrl%"=="" (
    echo [ERROR] Remote URL cannot be empty.
    goto end
)

REM === Prompt for branch name ===
set /p branchName="Enter branch name (default: main): "
if "%branchName%"=="" set branchName=main

echo.
echo === Checking if .git already exists ===
if exist ".git" (
    echo [INFO] A Git repository already exists here.
) else (
    echo [INFO] Initializing new Git repository...
    git init
    if errorlevel 1 (
        echo [ERROR] git init failed.
        goto end
    )
)

echo.
echo === Adding files ===
git add .
if errorlevel 1 (
    echo [ERROR] git add failed.
    goto end
)

echo.
echo === Creating commit ===
git commit -m "Initial commit"
if errorlevel 1 (
    echo [WARNING] Commit failed. Possibly no changes to commit.
)

echo.
echo === Adding remote origin ===
git remote add origin %remoteUrl% 2>nul
if errorlevel 1 (
    echo [WARNING] Remote 'origin' already exists. Skipping.
)

echo.
echo === Verifying remote ===
git remote -v
if errorlevel 1 (
    echo [ERROR] Could not verify remote.
    goto end
)

echo.
echo === Pushing to remote ===
git push -u origin %branchName%
if errorlevel 1 (
    echo [ERROR] Push failed. Check your remote URL, auth, or branch name.
    goto end
)

echo.
echo === SUCCESS ===
echo Repository initialized and pushed to %remoteUrl% on branch %branchName%.

:end
echo.
pause
