#!/bin/bash

VERSION=${1}
NAME=ruby

echo "Building version: ${VERSION}"
ruby-build ${VERSION} /usr/local/${NAME}/${VERSION}

echo "Compressing version: ${VERSION}"
tar -cJf /cache/${NAME}-${VERSION}.tar.xz -C /usr/local/${NAME} ${VERSION}
