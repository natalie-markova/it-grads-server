@echo off
echo ========================================
echo  IT-Grads Local Development Setup
echo ========================================
echo.

echo Step 1: Checking PostgreSQL password...
echo Please enter your PostgreSQL password for user 'postgres':
set /p PGPASSWORD="Password: "

echo.
echo Step 2: Creating database...
"C:\Program Files\PostgreSQL\17\bin\psql.exe" -U postgres -c "DROP DATABASE IF EXISTS itgrads_dev;"
"C:\Program Files\PostgreSQL\17\bin\psql.exe" -U postgres -c "CREATE DATABASE itgrads_dev;"

if errorlevel 1 (
    echo ERROR: Failed to create database
    echo Please check your PostgreSQL password and try again
    pause
    exit /b 1
)

echo.
echo Step 3: Updating .env.local with your password...
powershell -Command "(Get-Content .env.local) -replace 'postgres:postgres@localhost', 'postgres:%PGPASSWORD%@localhost' | Set-Content .env.local"

echo.
echo Step 4: Running database migrations...
call npm run db:sync

if errorlevel 1 (
    echo ERROR: Database sync failed
    pause
    exit /b 1
)

echo.
echo Step 5: Creating test users...
node create-test-users.js

if errorlevel 1 (
    echo ERROR: Failed to create test users
    pause
    exit /b 1
)

echo.
echo Step 6: Running seeders (sample data)...
call npm run db:seed

if errorlevel 1 (
    echo WARNING: Some seeders may have failed (this is OK if data already exists)
)

echo.
echo ========================================
echo  Setup Complete!
echo ========================================
echo.
echo Your local development environment is ready!
echo.
echo Database: itgrads_dev
echo Server will run on: http://localhost:5001
echo.
echo Test Users:
echo   Graduate: candidate@mail.ru / password123
echo   Employer: employer@mail.ru / password123
echo.
echo To start the server, run: npm start
echo.
pause