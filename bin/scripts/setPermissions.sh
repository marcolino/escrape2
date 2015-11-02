#!/bin/sh
#
# Set correct permissions in project path

find . -type f -not -path "./node_modules*" -not -path "./lib*" -not -path "./.git*" -not -path "./bin*" -not -path "./public/bower_components*" -exec chmod a-x \{\} \;
