#!/bin/bash

if [ -z $nw_sdk ]; then
  echo "nw_sdk is empty!"
  exit 1
fi

$nw_sdk .
