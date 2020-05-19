# renovate: datasource=docker depName=renovate/ubuntu versioning=docker
ARG UBUNTU_VERSION=18.04


#--------------------------------------
# base image
#--------------------------------------
FROM renovate/ubuntu:${UBUNTU_VERSION} as build

USER root

COPY --from=renovate/buildpack:2@sha256:a45c9e7a2277c19ae1a925be26fa907a1c6e737eb954a73e0bc763d1aa27522c /usr/local/build /usr/local/build
COPY --from=renovate/buildpack:2@sha256:a45c9e7a2277c19ae1a925be26fa907a1c6e737eb954a73e0bc763d1aa27522c /usr/local/bin /usr/local/bin

# loading env
ENV BASH_ENV=/usr/local/etc/env
SHELL ["/bin/bash" , "-c"]

ENTRYPOINT [ "docker-entrypoint.sh", "builder.sh" ]

RUN install-apt \
  build-essential \
  dumb-init \
  libssl-dev \
  libreadline-dev \
  zlib1g-dev \
  ;

RUN set -ex; \
  git clone https://github.com/rbenv/ruby-build.git; \
  PREFIX=/usr/local ./ruby-build/install.sh; \
  rm -rf ruby-build;

COPY bin /usr/local/bin

# rebuild trigger
# renovate: datasource=ruby-version depName=ruby-version versioning=ruby
ENV RUBY_VERSION=2.7.1
