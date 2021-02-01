ARG UBUNTU_VERSION=latest


#--------------------------------------
# base image
#--------------------------------------
FROM renovate/ubuntu:${UBUNTU_VERSION} as build

USER root

COPY --from=renovate/buildpack:2@sha256:eab1ab863b8c5d88fb3fbc75ec46e7d310e01f579c130d3301955c217488d2ba /usr/local/build /usr/local/build
COPY --from=renovate/buildpack:2@sha256:eab1ab863b8c5d88fb3fbc75ec46e7d310e01f579c130d3301955c217488d2ba /usr/local/bin /usr/local/bin

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
ENV RUBY_VERSION=2.7.2
