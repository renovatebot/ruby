#!/bin/bash

RUBY_VERSION=${1}

CODENAME=$(. /etc/os-release && echo ${VERSION_ID})

NAME=ruby

echo "Building ruby ${RUBY_VERSION} for ${CODENAME}"
ruby-build ${RUBY_VERSION} /usr/local/${NAME}/${RUBY_VERSION}

echo "Compressing ruby ${RUBY_VERSION} for ${CODENAME}"
tar -cJf /cache/${NAME}-${RUBY_VERSION}-${CODENAME}.tar.xz -C /usr/local/${NAME} ${RUBY_VERSION}
