:: Iniciar MySQL (se necessário)
net start MySQL80

:: Iniciar Backend
start "Backend" cmd /k "cd backend && npm run dev"

#:: Iniciar Frontend React
#start "Frontend React" cmd /k "cd frontend-react && npm start"

#:: Iniciar Frontend Angular
#start "Frontend Angular" cmd /k "cd frontend-angular && npm start"

:: Iniciar servidor
node app.cjs

echo Todos os serviços estão sendo iniciados...
echo - Para usar o sistema, acesse http://localhost:52251/
pause