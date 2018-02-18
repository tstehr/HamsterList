#! /usr/bin/env sh


convert -density 384 -background transparent shopping-basket.svg  -define icon:auto-resize ../public/favicon.ico

let "border = 32 * 3"
width=512
let "actual_width = $width - 2 * $border"
inkscape -z -e $(pwd)/TMP_apple-touch-icon.png -w $actual_width -h $actual_width $(pwd)/shopping-basket.svg
convert -border 75 -bordercolor white TMP_apple-touch-icon.png  ../public/apple-touch-icon.png
cp shopping-basket.svg ../public/mask-icon.svg
