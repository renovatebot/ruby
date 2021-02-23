
#--------------------------------------
# base image
#--------------------------------------
FROM renovate/buildpack:4@sha256:4ed029be823f6606092730f89ec488b78d8861d9f8c2ef67e1f60834d176258f as build

# build target, name required by binary-builder
ARG FLAVOR
RUN . /etc/os-release; [ "${VERSION_CODENAME}" == "${FLAVOR}" ] || exit 55

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
