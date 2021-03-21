#!/bin/bash

set -e

VERSION=${1}

CODENAME=$(. /etc/os-release && echo ${VERSION_CODENAME})

NAME=ruby
BUILD_ARGS=

if [[ "${DEBUG}" == "true" ]]; then
  BUILD_ARGS="-v"
fi

echo "Building ${NAME} ${VERSION} for ${CODENAME}"
ruby-build ${BUILD_ARGS} ${VERSION} /usr/local/${NAME}/${VERSION}

echo "Compressing ${NAME} ${VERSION} for ${CODENAME}"
tar -cJf /cache/${NAME}-${VERSION}-${CODENAME}.tar.xz -C /usr/local/${NAME} ${VERSION}
