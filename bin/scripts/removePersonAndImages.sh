#!/bin/sh
#
# Remove persons and images by key

pro='SGI'
per='adv3175'

/bin/rm -rf "data/images/$pro/$per/"* && \
/bin/echo "db.persons.remove({key: '$pro/$per'}); db.images.remove({personKey:'$pro/$per'})" | mongo escrape
