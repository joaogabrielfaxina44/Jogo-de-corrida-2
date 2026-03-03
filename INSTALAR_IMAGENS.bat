@echo off
:: Script para mover imagens para o NOVO PROJETO (Jogo de corrida 2)
set "folder=C:\Users\26012475\.gemini\antigravity\brain\3ef5595e-ad04-4805-8097-4f32adcb377a"
set "dest=C:\Users\26012475\Documents\GitHub\Jogo de corrida 2\assets"

echo Instalando imagens no NOVO PROJETO...

if not exist "%dest%" mkdir "%dest%"

copy /y "%folder%\player_supercar_v2_1772561026476.png" "%dest%\car_player.png"
copy /y "%folder%\enemy_car_v2_1772561042583.png" "%dest%\car_enemy.png"
copy /y "%folder%\item_box_1772551811272.png" "%dest%\item_box.png"
copy /y "%folder%\oil_spill_asset_1772560400439.png" "%dest%\oil.png"

echo.
echo PRONTO! Imagens instaladas em: %dest%
echo AGORA:
echo 1. Abrir o GitHub Desktop e adicione este novo repositorio: Jogo de corrida 2
echo 2. Fazer o COMMIT e PUSH para o GitHub Pages.
echo.
pause
