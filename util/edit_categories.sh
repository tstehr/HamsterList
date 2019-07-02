#!/usr/bin/env sh

if [ $# -eq 0 ]; then
	echo "Please supply list name as argument"
	exit 1
fi

temp_file="$(mktemp).json"

http GET https://list.tilman.ninja/api/$1/categories | jq . > $temp_file

${EDITOR:-vi} $temp_file

if ! jq "." $temp_file > /dev/null; then
	echo "JSON malformed, aborting"
	rm -f $temp_file 
	exit 1
fi

cat $temp_file | http PUT https://list.tilman.ninja/api/$1/categories

rm -f $temp_file 