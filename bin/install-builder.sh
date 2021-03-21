#!/bin/bash

set -e


echo "APT::Install-Recommends \"false\";" | tee -a /etc/apt/apt.conf.d/buildpack.conf
echo "APT::Get::Upgrade \"false\";" | tee -a /etc/apt/apt.conf.d/buildpack.conf
echo "APT::Get::Install-Suggests \"false\";" | tee -a /etc/apt/apt.conf.d/buildpack.conf


apt-get update
apt-get install -y \
  build-essential \
  ca-certificates \
  curl \
  dumb-init \
  git \
  libssl-dev \
  libreadline-dev \
  zlib1g-dev \
  ;

git clone https://github.com/rbenv/ruby-build.git
PREFIX=/usr/local ./ruby-build/install.sh

mkdir -p /usr/local/ruby /cache
