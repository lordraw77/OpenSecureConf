#!/bin/bash

pylint client/opensecureconf_client.py | tee clientpylint.txt
score=$(sed -n 's/^Your code has been rated at \([-0-9.]*\)\/.*/\1/p' clientpylint.txt)
echo "Pylint score: $score"
rm -f clientpylint.svg
anybadge --label="client pylint" --value=$score --file=clientpylint.svg 2=red 4=orange 8=yellow 10=green

 
pylint gui/gui.py | tee guipylint.txt
score=$(sed -n 's/^Your code has been rated at \([-0-9.]*\)\/.*/\1/p' guipylint.txt)
echo "Pylint score: $score"
rm -f guipylint.svg
anybadge --label="gui pylint" --value=$score --file=guipylint.svg 2=red 4=orange 8=yellow 10=green

pylint  server/api.py server/config_manager.py | tee serverpylint.txt
score=$(sed -n 's/^Your code has been rated at \([-0-9.]*\)\/.*/\1/p' serverpylint.txt)
echo "Pylint score: $score"
rm -f serverpylint.svg
anybadge --label="server pylint" --value=$score --file=serverpylint.svg 2=red 4=orange 8=yellow 10=green

rm -f clientpylint.txt guipylint.txt serverpylint.txt