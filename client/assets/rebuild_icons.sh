#! /usr/bin/env sh

convert -density 384 -background transparent shopping-basket.svg  -define icon:auto-resize ../public/favicon.ico
convert -border 100 -bordercolor white shopping-basket.svg ../public/apple-touch-icon.png
cp shopping-basket.svg ../public/mask-icon.svg
