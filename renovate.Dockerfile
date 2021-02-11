#-------------------------
# renovate rebuild trigger
#-------------------------

# makes lint happy
FROM scratch


# renovate: datasource=ruby-version depName=ruby versioning=ruby
ENV RUBY_VERSION=2.7.2


# rebuild trigger
# renovate: datasource=ruby-version depName=ruby versioning=ruby
ENV RUBY_VERSION=3.0.0
