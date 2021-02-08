ARG FLAVOR=latest


#--------------------------------------
# base image
#--------------------------------------
FROM renovate/buildpack:3-${FLAVOR} as build

USER root

ENTRYPOINT [ "docker-entrypoint.sh", "builder.sh" ]

RUN install-apt \
  build-essential \
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
# renovate: datasource=ruby-version depName=ruby versioning=ruby
ENV RUBY_VERSION=2.7.2
