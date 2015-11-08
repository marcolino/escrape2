#!/bin/sh
#
# Prune all data (!)

rm -rf data/images/*; echo "db.persons.drop(); db.images.drop()" | mongo --quiet escrape
