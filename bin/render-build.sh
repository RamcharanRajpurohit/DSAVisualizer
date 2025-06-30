#!/usr/bin/env bash

# 👷 Render build steps for Rails
bundle install
bundle exec rake db:migrate
bundle exec rake assets:precompile
