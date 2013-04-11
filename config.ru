# -*- ruby -*-
require 'rubygems'
require 'bundler'
Bundler.require
require './pushbin-web'
run Sinatra::Application
