#!/bin/bash

mkdir -p /tmp/nw_build
cp -r $(dirname $nw) /tmp/nw_build/nwjs

cd ~/source/website-builder/
zip -x *.git* -r /tmp/nw_build/nwjs/app.nw .

cd /tmp/nw_build/nwjs
cat nw app.nw > app && chmod +x app

#copy /b nw.exe+package.nw app.exe
