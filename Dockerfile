#--------------------------------------
# Ubuntu flavor
#--------------------------------------
ARG FLAVOR

#--------------------------------------
# base images
#--------------------------------------
FROM ubuntu:bionic as build-bionic
FROM ubuntu:focal as build-focal


#--------------------------------------
# builder images
#--------------------------------------
FROM build-${FLAVOR} as builder


ENTRYPOINT [ "dumb-init", "--", "builder.sh" ]

COPY bin /usr/local/bin

RUN install-builder.sh
