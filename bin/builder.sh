#!/bin/bash

RUBY_VERSION=${1}

CODENAME=$(. /etc/os-release && echo ${VERSION_CODENAME})

NAME=ruby

echo "Building ${NAME} ${RUBY_VERSION} for ${CODENAME}"
ruby-build ${RUBY_VERSION} /usr/local/${NAME}/${RUBY_VERSION}

echo "Compressing ${NAME} ${RUBY_VERSION} for ${CODENAME}"
tar -cJf /cache/${NAME}-${RUBY_VERSION}-${CODENAME}.tar.xz -C /usr/local/${NAME} ${RUBY_VERSION}
