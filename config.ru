# -*- ruby -*-
require 'rubygems'
require 'bundler'
Bundler.require
require './pusceiver-web'
run Sinatra::Application
