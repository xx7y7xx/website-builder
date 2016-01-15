#!/bin/bash

if [ -z $nw ]; then
  echo "nw is empty!"
  exit 1
fi

$nw .
